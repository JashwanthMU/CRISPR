from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from backend.app.auth import AuthUser, require_security
from backend.data_access import LiveDataUnavailable, demo_mode_enabled, load_assets, load_findings, require_demo_mode
from backend.database.connection import get_connection

from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude, calculate_eal
from backend.risk_engine.drivers import identify_risk_drivers
from backend.asset_intelligence.criticality import enrich_asset
from backend.controls.effectiveness import calculate_control_effectiveness, get_controls_for_asset
from ml.incident_prediction.model import predict_from_risk_row

router = APIRouter()

def _load_assets(organization_id: UUID | None = None) -> list[dict]:
    return load_assets(organization_id=organization_id)


def _load_risk_inputs(organization_id: UUID | None = None) -> list[dict]:
    """
    Risk cases are derived from real scanner findings (data/demo/vulnerabilities.json),
    not hand-typed numbers. One risk case per CVE/vulnerability finding.
    """
    findings = load_findings("VULNERABILITY_SCANNER", organization_id=organization_id)
    frequencies = {}
    if organization_id is not None and not demo_mode_enabled():
        with get_connection() as db:
            rows = db.execute(
                """SELECT DISTINCT ON (finding_id) finding_id,assessment_id,
                          annual_incident_probability,methodology,evidence_reference,
                          source_name,confidence,observed_at,valid_until
                   FROM incident_frequency_assessments
                   WHERE organization_id=%s AND observed_at <= NOW() AND valid_until > NOW()
                   ORDER BY finding_id,observed_at DESC,created_at DESC""",
                (organization_id,),
            ).fetchall()
        frequencies = {row["finding_id"]: row for row in rows}
    inputs = []
    for f in findings:
        # days_since_published is derived from the real NVD published_date
        # (fetched by tools/enrich_vulnerabilities.py) - None if not yet
        # enriched, so predict_from_risk_row falls back to its own default
        # rather than a fabricated day count.
        days_since_published = None
        published_date = f.get("published_date")
        if published_date:
            try:
                from datetime import date
                pub = date.fromisoformat(published_date)
                days_since_published = (date.today() - pub).days
            except (ValueError, TypeError):
                pass

        frequency = frequencies.get(f.get("finding_id"), {})
        inputs.append({
            "asset_id": f["asset_id"],
            "cve_id": f.get("cve"),
            "cvss": f.get("cvss", 7.0),
            "exploit_in_wild": f.get("exploited_in_wild", False),
            "patch_age_days": f.get("patch_age_days", 30),
            "threat_intel": f.get("exploited_in_wild", False),
            "primary_finding_type": f.get("source_type", "VULNERABILITY_SCANNER"),
            "confidence": f.get("confidence", 0.7),
            "finding_id": f.get("finding_id"),
            "title": f.get("title"),
            # Optional NVD/EPSS enrichment - present only after running
            # tools/enrich_vulnerabilities.py; absent findings fall back
            # to predict_from_risk_row()'s own defaults, not fabricated values.
            "epss_score": f.get("epss_score"),
            "epss_percentile": f.get("epss_percentile"),
            "attack_vector": f.get("attack_vector"),
            "attack_complexity": f.get("attack_complexity"),
            "privileges_required": f.get("privileges_required"),
            "user_interaction": f.get("user_interaction"),
            "scope": f.get("scope"),
            "exploitability_score": f.get("exploitability_score"),
            "impact_score": f.get("impact_score"),
            "days_since_published": days_since_published,
            "flag_rce": f.get("flag_rce"),
            "flag_sqli": f.get("flag_sqli"),
            "flag_xss": f.get("flag_xss"),
            "flag_buffer_overflow": f.get("flag_buffer_overflow"),
            "flag_priv_escalation": f.get("flag_priv_escalation"),
            "flag_dos": f.get("flag_dos"),
            "flag_dir_traversal": f.get("flag_dir_traversal"),
            "annual_incident_probability": frequency.get("annual_incident_probability"),
            "frequency_evidence": frequency or None,
        })
    return inputs


def compute_risk(inp: dict, assets: list[dict], explain: bool = False, organization_id: UUID | None = None) -> dict:
    asset = next((a for a in assets if a["asset_id"] == inp["asset_id"]), None)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Asset {inp['asset_id']} not found")

    required_live_model_fields = (
        "cvss", "epss_score", "epss_percentile", "days_since_published",
        "attack_vector", "attack_complexity", "privileges_required",
        "user_interaction", "scope", "exploitability_score", "impact_score",
    )
    missing_model_fields = [
        field for field in required_live_model_fields if inp.get(field) is None
    ]
    if missing_model_fields and not demo_mode_enabled():
        raise LiveDataUnavailable(
            f"Finding {inp.get('finding_id')} lacks model inputs: {', '.join(missing_model_fields)}"
        )

    controls = get_controls_for_asset(inp["asset_id"], organization_id=organization_id)
    ce = calculate_control_effectiveness(controls)

    # ── Likelihood: ML model first, rule-based FAIR formula as fallback ──
    # predict_from_risk_row returns None / an error_fallback dict if the
    # model artifacts fail to load - in that case we fall back to the
    # deterministic rule-based likelihood so the API never silently breaks.
    model_result = predict_from_risk_row({
        "cvss": inp["cvss"],
        "exploit_in_wild": inp["exploit_in_wild"],
        "patch_age_days": inp["patch_age_days"],
        "internet_facing": asset.get("internet_facing", False),
        "control_effectiveness_pct": round(ce * 100, 1),
        "cve_id": inp.get("cve_id"),
        # Pass real enrichment where available; predict_from_risk_row/
        # predict_incident already default missing values sensibly, so
        # None here just means "let the model use its own default", not
        # a fabricated number.
        "epss_score": inp.get("epss_score"),
        "epss_percentile": inp.get("epss_percentile"),
        "attack_vector": inp.get("attack_vector"),
        "attack_complexity": inp.get("attack_complexity"),
        "privileges_required": inp.get("privileges_required"),
        "user_interaction": inp.get("user_interaction"),
        "scope": inp.get("scope"),
        "exploitability_score": inp.get("exploitability_score"),
        "impact_score": inp.get("impact_score"),
        "days_since_published": inp.get("days_since_published"),
        "flag_rce": inp.get("flag_rce"),
        "flag_sqli": inp.get("flag_sqli"),
        "flag_xss": inp.get("flag_xss"),
        "flag_buffer_overflow": inp.get("flag_buffer_overflow"),
        "flag_priv_escalation": inp.get("flag_priv_escalation"),
        "flag_dos": inp.get("flag_dos"),
        "flag_dir_traversal": inp.get("flag_dir_traversal"),
        "explain": explain,
    })

    used_model_probability = (
        model_result is not None
        and model_result.get("probability") is not None
        and model_result.get("model") == "xgb_v4_calibrated (Platt)"
    )

    if not demo_mode_enabled():
        if not used_model_probability:
            raise LiveDataUnavailable(
                f"A calibrated ML ranking is unavailable for finding {inp.get('finding_id')}"
            )
        frequency = inp.get("frequency_evidence")
        if not frequency:
            raise LiveDataUnavailable(
                f"Finding {inp.get('finding_id')} lacks a current annual incident-frequency assessment"
            )
        likelihood = float(frequency["annual_incident_probability"])
        lh_dict = {
            "ranking_score": model_result.get("ranking_score"),
            "incident_probability": likelihood,
            "frequency_evidence_available": True,
            "likelihood_semantics": "organization-supplied annual incident probability",
            "calculation": {
                "assessment_id": str(frequency["assessment_id"]),
                "methodology": frequency["methodology"],
                "evidence_reference": frequency["evidence_reference"],
                "source_name": frequency["source_name"],
                "confidence": frequency["confidence"],
                "observed_at": frequency["observed_at"],
                "valid_until": frequency["valid_until"],
                "kev_probability": model_result.get("probability"),
                "kev_probability_use": "prioritization only; excluded from EAL",
            },
        }
        model_used = model_result["model"]
    elif used_model_probability:
        lh_dict = calculate_likelihood(
            cvss=inp["cvss"],
            exploit_in_wild=inp["exploit_in_wild"],
            patch_age_days=inp["patch_age_days"],
            internet_facing=asset.get("internet_facing", False),
            control_effectiveness=ce,
            threat_intel_active=inp["threat_intel"],
            model_features=inp,
        )
        likelihood = lh_dict["incident_probability"]
        model_used = model_result["model"]
    else:
        if not demo_mode_enabled():
            raise LiveDataUnavailable(
                f"A calibrated ML prediction is unavailable for finding {inp.get('finding_id')}"
            )
        lh_dict = calculate_likelihood(
            cvss=inp["cvss"],
            exploit_in_wild=inp["exploit_in_wild"],
            patch_age_days=inp["patch_age_days"],
            internet_facing=asset.get("internet_facing", False),
            control_effectiveness=ce,
            threat_intel_active=inp["threat_intel"],
        )
        likelihood = lh_dict["incident_probability"]
        model_used = "rule_based_fair_formula"

    # ── Financial impact: always the real FAIR loss calculator, never
    # reverse-fitted or overridden by a hardcoded target ──
    loss_magnitude = calculate_loss_magnitude(asset)
    eal = calculate_eal(likelihood, loss_magnitude)

    finding = {"source_type": inp["primary_finding_type"], "confidence": inp["confidence"]}
    drivers = identify_risk_drivers(asset, finding, controls)

    enriched = enrich_asset(asset)

    return {
        "finding_id": inp.get("finding_id"),
        "asset_id": asset["asset_id"],
        "asset_name": asset["name"],
        "business_service": asset.get("business_service"),
        "title": inp.get("title"),
        "cve_id": inp.get("cve_id"),
        "business_criticality": enriched["business_criticality"],
        "control_effectiveness_pct": round(ce * 100, 1),
        "model_used": model_used,
        "ranking_score": model_result.get("ranking_score") if used_model_probability else None,
        "model_tier": model_result.get("tier") if used_model_probability else None,
        "model_contributions": model_result.get("contributions") if used_model_probability else None,
        "likelihood_calculation": lh_dict,
        **eal,
        "loss_breakdown": loss_magnitude,
        "risk_drivers": drivers,
    }


def _all_risks(organization_id: UUID | None = None) -> list[dict]:
    assets = _load_assets(organization_id)
    risk_inputs = _load_risk_inputs(organization_id)
    risks = [compute_risk(inp, assets, organization_id=organization_id) for inp in risk_inputs]
    risks.sort(key=lambda x: x["eal_inr"], reverse=True)
    return risks


def _aggregate_asset_risks(risks: list[dict]) -> list[dict]:
    """Avoid charging the same asset loss once for every vulnerability.

    Finding probabilities are combined as a disclosed independent union. This
    is still an assumption, but it is materially safer than summing a complete
    asset loss for each finding and hiding the resulting double count.
    """
    grouped: dict[str, list[dict]] = {}
    for risk in risks:
        grouped.setdefault(risk["asset_id"], []).append(risk)

    asset_risks = []
    for asset_id, rows in grouped.items():
        probability_no_event = 1.0
        for row in rows:
            probability_no_event *= 1.0 - row["likelihood"]
        probability = 1.0 - probability_no_event
        loss_magnitude = max(row["loss_magnitude_inr"] for row in rows)
        eal = calculate_eal(probability, {"total_inr": loss_magnitude})
        asset_risks.append({
            "asset_id": asset_id,
            "asset_name": rows[0]["asset_name"],
            "finding_count": len(rows),
            **eal,
            "aggregation": {
                "probability_formula": "1 - product(1 - finding_probability)",
                "dependence_assumption": "finding exploit events are independent",
                "loss_counting": "one asset loss magnitude per simulated asset incident",
            },
        })
    asset_risks.sort(key=lambda row: row["eal_inr"], reverse=True)
    return asset_risks


@router.get("")
def get_all_risks(user: AuthUser = Depends(require_security)):
    organization_id = user.organization_id if isinstance(user, AuthUser) else None
    risks = _all_risks(organization_id)
    asset_risks = _aggregate_asset_risks(risks)
    total_eal = sum(r["eal_inr"] for r in asset_risks)
    return {
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "risks": risks,
        "asset_risk_aggregation": asset_risks,
        "financial_methodology": {
            "formula": "EAL = sourced annual incident probability × loss magnitude",
            "kev_model_use": "prioritization only; excluded from EAL",
            "frequency_source": "latest unexpired organization assessment per finding",
        },
    }


def calculate_enterprise_summary(organization_id: UUID | None = None):
    from backend.financial_engine.monte_carlo import run_monte_carlo
    
    risks = _all_risks(organization_id)
    asset_risks = _aggregate_asset_risks(risks)
    total_eal = sum(r["eal_inr"] for r in asset_risks)
    avg_score = sum(r["risk_score"] for r in risks) / len(risks) if risks else 0
    top_score = risks[0]["risk_score"] if risks else 0
    enterprise_risk_score = round((2 * top_score + avg_score) / 3)

    mc_data = [
        {
            "incident_probability": row["likelihood"],
            "loss_magnitude_inr": row["loss_magnitude_inr"],
        }
        for row in asset_risks
    ]
    mc = run_monte_carlo(mc_data)

    return {
        "enterprise_risk_score": enterprise_risk_score,
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "var_95_inr": mc["var_95"],
        "var_95_lakh": round(mc["var_95"] / 100_000, 2),
        "var_99_inr": mc["var_99"],
        "var_99_lakh": round(mc["var_99"] / 100_000, 2),
        "mean_annual_loss_inr": mc["mean_annual_loss"],
        "tail_value_at_risk_95_inr": mc["tail_value_at_risk_95"],
        "monte_carlo_methodology": mc["simulation"],
        "financial_methodology": {
            "formula": "EAL = sourced annual incident probability × loss magnitude",
            "kev_model_use": "prioritization only; excluded from EAL",
            "frequency_source": "latest unexpired organization assessment per finding",
        },
        "top_risk": risks[0] if risks else None,
        "asset_risk_aggregation": asset_risks,
    }


@router.get("/enterprise")
def get_enterprise_summary(user: AuthUser = Depends(require_security)):
    # Direct calls are retained for engine unit tests; HTTP calls always
    # receive an authenticated AuthUser from FastAPI.
    organization_id = user.organization_id if isinstance(user, AuthUser) else None
    return calculate_enterprise_summary(organization_id)


@router.get("/{asset_id}")
def get_risk_by_asset(asset_id: str, explain: bool = False, user: AuthUser = Depends(require_security)):
    """
    explain=true computes per-finding SHAP contributions (slower - only
    used on this single-asset detail view, never on the list endpoint,
    to avoid slowing down /api/risks for every asset on every request).
    """
    organization_id = user.organization_id if isinstance(user, AuthUser) else None
    risk_inputs = _load_risk_inputs(organization_id)
    matches = [i for i in risk_inputs if i["asset_id"] == asset_id]
    if not matches:
        raise HTTPException(status_code=404, detail=f"No risk case modeled for asset {asset_id}")
    assets = _load_assets(organization_id)
    computed = [compute_risk(inp, assets, explain=explain, organization_id=organization_id) for inp in matches]
    computed.sort(key=lambda x: x["eal_inr"], reverse=True)
    return computed[0] if len(computed) == 1 else {"asset_id": asset_id, "risk_cases": computed}
@router.get("/{asset_id}/telemetry-model")
def get_telemetry_model(asset_id: str, version: str = "v1", user: AuthUser = Depends(require_security)):
    require_demo_mode("Telemetry risk model")
    assets = _load_assets(user.organization_id)
    asset = next((a for a in assets if a["asset_id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    inputs = _load_risk_inputs(user.organization_id)
    findings = [inp for inp in inputs if inp["asset_id"] == asset_id]
    
    controls = get_controls_for_asset(asset_id, organization_id=user.organization_id)
    
    # Mock telemetry for now, since it's a demo
    telemetry = {
        "iam": {"risk_score": 0.8},
        "siem": {"alert_severity": 0.5},
        "edr": {"alert_severity": 0.6},
        "cspm": {"misconfig_score": 0.7}
    }
    
    from backend.risk_engine.incident_model import calculate_telemetry_incident_probability
    return calculate_telemetry_incident_probability(asset, findings, telemetry, controls, version=version)
