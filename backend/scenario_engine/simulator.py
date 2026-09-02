"""
What-if scenario simulator.
Recalculates EAL after applying a control change dynamically.
"""

from backend.scenario_engine.risk_service import calculate_baseline
from backend.controls.effectiveness import calculate_control_effectiveness, DEMO_CONTROLS
from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude

# Finding context per asset — covers all 20 NovaPay assets
# A001-A006: original demo assets (high fidelity)
# A007-A020: extended assets with realistic defaults
DEMO_FINDINGS = {
    "A001": {"cvss": 8.5,  "exploit_in_wild": True,  "patch_age_days": 18, "threat_intel_active": True},
    "A002": {"cvss": 10.0, "exploit_in_wild": True,  "patch_age_days": 14, "threat_intel_active": True},
    "A003": {"cvss": 9.8,  "exploit_in_wild": True,  "patch_age_days": 21, "threat_intel_active": True},
    "A004": {"cvss": 7.5,  "exploit_in_wild": False, "patch_age_days": 30, "threat_intel_active": False},
    "A005": {"cvss": 6.2,  "exploit_in_wild": False, "patch_age_days": 50, "threat_intel_active": False},
    "A006": {"cvss": 9.8,  "exploit_in_wild": True,  "patch_age_days": 90, "threat_intel_active": False},
    # Extended assets — realistic patch lag and exploitation data
    "A007": {"cvss": 7.8,  "exploit_in_wild": True,  "patch_age_days": 25, "threat_intel_active": True},
    "A008": {"cvss": 8.2,  "exploit_in_wild": True,  "patch_age_days": 18, "threat_intel_active": True},
    "A009": {"cvss": 6.5,  "exploit_in_wild": False, "patch_age_days": 35, "threat_intel_active": False},
    "A010": {"cvss": 9.1,  "exploit_in_wild": True,  "patch_age_days": 12, "threat_intel_active": True},
    "A011": {"cvss": 5.8,  "exploit_in_wild": False, "patch_age_days": 45, "threat_intel_active": False},
    "A012": {"cvss": 7.2,  "exploit_in_wild": True,  "patch_age_days": 28, "threat_intel_active": False},
    "A013": {"cvss": 8.8,  "exploit_in_wild": True,  "patch_age_days": 16, "threat_intel_active": True},
    "A014": {"cvss": 6.9,  "exploit_in_wild": False, "patch_age_days": 40, "threat_intel_active": False},
    "A015": {"cvss": 9.3,  "exploit_in_wild": True,  "patch_age_days": 22, "threat_intel_active": True},
    "A016": {"cvss": 5.5,  "exploit_in_wild": False, "patch_age_days": 60, "threat_intel_active": False},
    "A017": {"cvss": 7.6,  "exploit_in_wild": True,  "patch_age_days": 33, "threat_intel_active": False},
    "A018": {"cvss": 8.4,  "exploit_in_wild": True,  "patch_age_days": 19, "threat_intel_active": True},
    "A019": {"cvss": 6.1,  "exploit_in_wild": False, "patch_age_days": 55, "threat_intel_active": False},
    "A020": {"cvss": 7.0,  "exploit_in_wild": False, "patch_age_days": 42, "threat_intel_active": False},
}

def simulate_scenario(base_controls: dict, overrides: dict, asset: dict, finding: dict) -> dict:
    before = calculate_baseline(asset, finding, base_controls)
    updated_controls = {**base_controls, **{k: v for k, v in overrides.items() if k != "patch_delay_days"}}
    finding_after = dict(finding)
    if "patch_delay_days" in overrides:
        finding_after["patch_age_days"] = finding.get("patch_age_days", 30) + int(overrides["patch_delay_days"])
    after = calculate_baseline(asset, finding_after, updated_controls)
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
        "control_effectiveness_before": round(ce_before * 100, 1),
        "control_effectiveness_after": round(ce_after * 100, 1),
    }


def simulate_enterprise(assets: list, overrides: dict) -> dict:
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

    per_asset = []
    before_total = 0
    after_total = 0
    
    for asset in assets:
        aid = asset["asset_id"]
        base_controls = DEMO_CONTROLS.get(aid, {})
        finding = DEMO_FINDINGS.get(aid, {"cvss": 7.0, "exploit_in_wild": False, "patch_age_days": 30})
        # Pass patch_delay_days into control_overrides so simulate_scenario applies it to finding_after
        effective_overrides = dict(control_overrides)
        if patch_delay_days > 0:
            effective_overrides["patch_delay_days"] = patch_delay_days
        result = simulate_scenario(base_controls, effective_overrides, asset, finding)
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
        "per_asset": per_asset,
    }


def align_enterprise_baseline(result: dict, baseline_eal_inr: float) -> dict:
    baseline = round(baseline_eal_inr)
    original_before = result.get("before_total_eal_inr", 0)
    reduction = result.get("reduction_inr", 0)
    rows = result.get("per_asset", [])
    aligned_rows = []
    allocated_before = 0
    allocated_reduction = 0

    for index, row in enumerate(rows):
        is_last = index == len(rows) - 1
        share = row.get("before_eal_inr", 0) / original_before if original_before else 0
        before = baseline - allocated_before if is_last else round(baseline * share)
        asset_reduction = reduction - allocated_reduction if is_last else round(reduction * share)
        after = before - asset_reduction
        aligned_rows.append({
            **row,
            "before_eal_inr": before,
            "before_eal_lakh": round(before / 100_000, 2),
            "after_eal_inr": after,
            "after_eal_lakh": round(after / 100_000, 2),
            "reduction_inr": asset_reduction,
            "reduction_lakh": round(asset_reduction / 100_000, 2),
            "reduction_pct": round(asset_reduction / before * 100, 1) if before else 0,
        })
        allocated_before += before
        allocated_reduction += asset_reduction

    after_total = baseline - reduction
    return {
        **result,
        "before_total_eal_inr": baseline,
        "before_total_eal_lakh": round(baseline / 100_000, 2),
        "after_total_eal_inr": after_total,
        "after_total_eal_lakh": round(after_total / 100_000, 2),
        "reduction_pct": round(reduction / baseline * 100, 1) if baseline else 0,
        "per_asset": aligned_rows,
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
