"""What-if scenario simulator using ingested vulnerability attributes."""

from datetime import date
from math import prod

from backend.scenario_engine.risk_service import calculate_baseline
from backend.controls.effectiveness import calculate_control_effectiveness, get_controls_for_asset
from backend.data_access import demo_mode_enabled, load_findings
from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_eal, calculate_loss_magnitude

def load_scenario_findings(organization_id=None) -> dict[str, list[dict]]:
    """Load enriched scanner findings; never invent a finding for an asset."""
    rows = load_findings("VULNERABILITY_SCANNER", organization_id=organization_id)
    findings: dict[str, list[dict]] = {}
    for row in rows:
        if not row.get("asset_id") or row.get("cvss") is None:
            continue
        finding = dict(row)
        finding["exploit_in_wild"] = bool(row.get("exploited_in_wild", False))
        finding["threat_intel_active"] = bool(row.get("exploited_in_wild", False))
        if row.get("published_date"):
            try:
                finding["days_since_published"] = (date.today() - date.fromisoformat(row["published_date"])).days
            except (TypeError, ValueError):
                pass
        findings.setdefault(row["asset_id"], []).append(finding)
    return findings

def simulate_scenario(base_controls: dict, overrides: dict, asset: dict, finding: dict) -> dict:
    before = calculate_baseline(asset, finding, base_controls)
    updated_controls = {**base_controls, **{k: v for k, v in overrides.items() if k != "patch_delay_days"}}
    finding_after = dict(finding)
    patch_delay_days = int(overrides.get("patch_delay_days", 0))
    if patch_delay_days:
        finding_after["patch_age_days"] = finding.get("patch_age_days", 30) + patch_delay_days
    after = calculate_baseline(
        asset,
        finding_after,
        updated_controls,
        patch_delay_days=patch_delay_days,
    )
    reduction = before["eal_inr"] - after["eal_inr"]
    ce_before = calculate_control_effectiveness(base_controls)
    ce_after = calculate_control_effectiveness(updated_controls)
    return {
        "asset_id": asset.get("asset_id"),
        "asset_name": asset.get("name"),
        "before_eal_inr": before["eal_inr"],
        "before_eal_lakh": before["eal_lakh"],
        "after_eal_inr": after["eal_inr"],
        "after_eal_lakh": after["eal_lakh"],
        "reduction_inr": round(reduction),
        "reduction_lakh": round(reduction / 100_000, 2),
        "reduction_pct": round(reduction / before["eal_inr"] * 100, 1) if before["eal_inr"] > 0 else 0,
        "control_change": overrides,
        "before_likelihood": before["likelihood"],
        "after_likelihood": after["likelihood"],
        "likelihood_calculation": after.get("likelihood_calculation"),
        "control_effectiveness_before": round(ce_before * 100, 1),
        "control_effectiveness_after": round(ce_after * 100, 1),
    }


def simulate_enterprise(assets: list, overrides: dict, findings_by_asset: dict | None = None, organization_id=None) -> dict:
    control_overrides = {}
    if overrides.get("implement_mfa") is True or overrides.get("mfa_coverage") is not None:
        control_overrides["mfa_coverage"] = float(overrides.get("mfa_coverage", 1.0))
    if overrides.get("implement_segmentation") is True:
        control_overrides["segmentation"] = 0.95
    if overrides.get("implement_patching") is True:
        control_overrides["patch_compliance"] = 0.95
    if overrides.get("edr_expand") is True:
        control_overrides["edr_coverage"] = 1.0
    if overrides.get("cloud_hardening") is True:
        control_overrides["waf_enabled"] = True
        control_overrides["segmentation"] = min(1.0, control_overrides.get("segmentation", 0) + 0.20)
    if overrides.get("immutable_backup") is True:
        # Backup reduces recovery cost but not likelihood directly
        # Model it as improved logging coverage reducing detection time
        control_overrides["logging_coverage"] = 1.0
    if overrides.get("training") is True:
        # Security training improves MFA adoption and reduces phishing risk
        control_overrides["mfa_coverage"] = min(1.0, control_overrides.get("mfa_coverage", 0.6) + 0.15)
    # patch_delay goes into finding_overrides (not control_overrides)
    # so it reaches finding_after in simulate_scenario
    patch_delay_days = 0
    if "patch_delay" in overrides or "patch_delay_days" in overrides:
        patch_delay_days = int(overrides.get("patch_delay") or overrides.get("patch_delay_days") or 0)

    findings_by_asset = findings_by_asset if findings_by_asset is not None else load_scenario_findings(organization_id)
    per_asset = []
    before_total = 0
    after_total = 0
    
    for asset in assets:
        aid = asset["asset_id"]
        base_controls = get_controls_for_asset(aid, organization_id=organization_id)
        asset_findings = findings_by_asset.get(aid)
        if asset_findings is None:
            # Missing telemetry means "not calculated", not a fabricated
            # average vulnerability.
            continue
        if isinstance(asset_findings, dict):
            asset_findings = [asset_findings]
        if not asset_findings:
            continue
        # Calculate every finding, then combine probabilities once per asset so
        # loss magnitude is not counted once for every vulnerability.
        effective_overrides = dict(control_overrides)
        if patch_delay_days > 0:
            effective_overrides["patch_delay_days"] = patch_delay_days
        finding_results = [
            simulate_scenario(base_controls, effective_overrides, asset, finding)
            for finding in asset_findings
        ]
        before_probability = 1.0 - prod(
            1.0 - row["before_likelihood"] for row in finding_results
        )
        after_probability = 1.0 - prod(
            1.0 - row["after_likelihood"] for row in finding_results
        )
        loss_magnitude = calculate_loss_magnitude(asset)
        before_eal = calculate_eal(before_probability, loss_magnitude)
        after_eal = calculate_eal(after_probability, loss_magnitude)
        reduction = before_eal["eal_inr"] - after_eal["eal_inr"]
        result = {
            **finding_results[0],
            "finding_count": len(finding_results),
            "before_likelihood": before_probability,
            "after_likelihood": after_probability,
            "before_eal_inr": before_eal["eal_inr"],
            "before_eal_lakh": before_eal["eal_lakh"],
            "after_eal_inr": after_eal["eal_inr"],
            "after_eal_lakh": after_eal["eal_lakh"],
            "reduction_inr": reduction,
            "reduction_lakh": round(reduction / 100_000, 2),
            "reduction_pct": (
                round(reduction / before_eal["eal_inr"] * 100, 1)
                if before_eal["eal_inr"] else 0
            ),
            "likelihood_calculation": finding_results[0]["likelihood_calculation"] if len(finding_results) == 1 else {
                "probability_formula": "1 - product(1 - finding_probability)",
                "dependence_assumption": "finding exploit events are independent",
                "loss_counting": "one loss magnitude per asset incident",
                "findings": [row["likelihood_calculation"] for row in finding_results],
            },
        }
        per_asset.append(result)
        before_total += result["before_eal_inr"]
        after_total += result["after_eal_inr"]

    reduction = before_total - after_total

    return {
        "before_total_eal_inr": round(before_total),
        "before_total_eal_lakh": round(before_total / 100_000, 2),
        "after_total_eal_inr": round(after_total),
        "after_total_eal_lakh": round(after_total / 100_000, 2),
        "reduction_inr": round(reduction),
        "reduction_lakh": round(reduction / 100_000, 2),
        "reduction_pct": round(reduction / before_total * 100, 1) if before_total > 0 else 0,
        "overrides_applied": control_overrides,
        "calculation_scope": {
            "assets_received": len(assets),
            "assets_calculated": len(per_asset),
            "assets_excluded_missing_findings": len(assets) - len(per_asset),
            "data_mode": "demo" if demo_mode_enabled() else "live",
            "finding_source": (
                "data/demo/vulnerabilities.json fixture"
                if demo_mode_enabled()
                else "persisted LIVE VULNERABILITY_SCANNER findings"
            ),
        },
        "per_asset": per_asset,
    }


PRESET_SCENARIOS = [
    {"id": "mfa", "name": "Implement MFA for privileged accounts",
     "description": "Raise MFA coverage to 100% across all assets",
     "params": {"implement_mfa": True}, "cost_inr": 1_500_000, "complexity": "Low", "time_weeks": 2},
    {"id": "patch_now", "name": "Emergency patch deployment",
     "description": "Immediately patch critical CVEs (raise patch compliance)",
     "params": {"implement_patching": True}, "cost_inr": 800_000, "complexity": "Medium", "time_weeks": 1},
    {"id": "segment", "name": "Network micro-segmentation",
     "description": "Segment payment environment from rest of network",
     "params": {"implement_segmentation": True}, "cost_inr": 3_000_000, "complexity": "High", "time_weeks": 6},
    {"id": "delay_30", "name": "Delay patching by 30 days",
     "description": "What happens if we wait 30 days before patching",
     "params": {"patch_delay": 30}, "cost_inr": 0, "complexity": "N/A", "time_weeks": 0},
]
