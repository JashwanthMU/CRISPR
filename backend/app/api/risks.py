from fastapi import APIRouter, HTTPException
import json
from pathlib import Path

from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude, calculate_eal
from backend.risk_engine.drivers import identify_risk_drivers
from backend.asset_intelligence.criticality import enrich_asset
from backend.controls.effectiveness import calculate_control_effectiveness, get_controls_for_asset
from ml.incident_prediction.model import predict_from_risk_row

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[3]
ASSETS_PATH = BASE_DIR / "data" / "demo" / "assets.json"
VULNS_PATH = BASE_DIR / "data" / "demo" / "vulnerabilities.json"


def _load_assets() -> list[dict]:
    if not ASSETS_PATH.exists():
        raise HTTPException(status_code=500, detail=f"assets.json not found at {ASSETS_PATH}")
    return json.load(open(ASSETS_PATH))


def _load_risk_inputs() -> list[dict]:
    """
    Risk cases are derived from real scanner findings (data/demo/vulnerabilities.json),
    not hand-typed numbers. One risk case per CVE/vulnerability finding.
    """
    if not VULNS_PATH.exists():
        return []
    findings = json.load(open(VULNS_PATH))
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
        })
    return inputs


def compute_risk(inp: dict, assets: list[dict], explain: bool = False) -> dict:
    asset = next((a for a in assets if a["asset_id"] == inp["asset_id"]), None)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Asset {inp['asset_id']} not found")

    controls = get_controls_for_asset(inp["asset_id"])
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
        and model_result.get("model") not in (None, "error_fallback")
    )

    if used_model_probability:
        likelihood = model_result["probability"]
        model_used = model_result["model"]
    else:
        likelihood = calculate_likelihood(
            cvss=inp["cvss"],
            exploit_in_wild=inp["exploit_in_wild"],
            patch_age_days=inp["patch_age_days"],
            internet_facing=asset.get("internet_facing", False),
            control_effectiveness=ce,
            threat_intel_active=inp["threat_intel"],
        )
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
        "model_tier": model_result.get("tier") if used_model_probability else None,
        "model_contributions": model_result.get("contributions") if used_model_probability else None,
        **eal,
        "loss_breakdown": loss_magnitude,
        "risk_drivers": drivers,
    }


def _all_risks() -> list[dict]:
    assets = _load_assets()
    risk_inputs = _load_risk_inputs()
    risks = [compute_risk(inp, assets) for inp in risk_inputs]
    risks.sort(key=lambda x: x["eal_inr"], reverse=True)
    return risks


@router.get("")
def get_all_risks():
    risks = _all_risks()
    total_eal = sum(r["eal_inr"] for r in risks)
    return {
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "risks": risks,
    }


@router.get("/enterprise")
def get_enterprise_summary():
    risks = _all_risks()
    total_eal = sum(r["eal_inr"] for r in risks)
    avg_score = sum(r["risk_score"] for r in risks) / len(risks) if risks else 0
    top_score = risks[0]["risk_score"] if risks else 0
    enterprise_risk_score = round((2 * top_score + avg_score) / 3)

    return {
        "enterprise_risk_score": enterprise_risk_score,
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "var_95_inr": round(total_eal * 3.2),
        "var_95_lakh": round(total_eal * 3.2 / 100_000, 2),
        "top_risk": risks[0] if risks else None,
    }


@router.get("/{asset_id}")
def get_risk_by_asset(asset_id: str, explain: bool = False):
    """
    explain=true computes per-finding SHAP contributions (slower - only
    used on this single-asset detail view, never on the list endpoint,
    to avoid slowing down /api/risks for every asset on every request).
    """
    risk_inputs = _load_risk_inputs()
    matches = [i for i in risk_inputs if i["asset_id"] == asset_id]
    if not matches:
        raise HTTPException(status_code=404, detail=f"No risk case modeled for asset {asset_id}")
    assets = _load_assets()
    computed = [compute_risk(inp, assets, explain=explain) for inp in matches]
    computed.sort(key=lambda x: x["eal_inr"], reverse=True)
    return computed[0] if len(computed) == 1 else {"asset_id": asset_id, "risk_cases": computed}