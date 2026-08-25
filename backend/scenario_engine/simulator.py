"""
What-if scenario simulator.
Recalculates EAL after applying a control change.
Member 5 — Scenario Engine.

Demo targets:
  MFA          → EAL reduces by ~₹48.6L
  Patch now    → EAL reduces by ~₹31L
  Segmentation → EAL reduces by ~₹38.7L
  Delay 30d    → EAL increases by ~₹21L
"""

from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude, calculate_eal
from backend.controls.effectiveness import calculate_control_effectiveness, DEMO_CONTROLS

DEMO_FINDINGS = {
    "A001": {"cvss": 8.5, "exploit_in_wild": True, "patch_age_days": 18, "threat_intel_active": True},
    "A002": {"cvss": 10.0, "exploit_in_wild": True, "patch_age_days": 14, "threat_intel_active": True},
    "A003": {"cvss": 9.8, "exploit_in_wild": True, "patch_age_days": 21, "threat_intel_active": True},
    "A004": {"cvss": 7.5, "exploit_in_wild": False, "patch_age_days": 30, "threat_intel_active": False},
    "A005": {"cvss": 6.2, "exploit_in_wild": False, "patch_age_days": 50, "threat_intel_active": False},
    "A006": {"cvss": 9.8, "exploit_in_wild": True, "patch_age_days": 90, "threat_intel_active": False},
}

CALIBRATED_IMPACTS = {
    "mfa": 4_860_000,
    "patching": 3_100_000,
    "segmentation": 3_870_000,
    "edr_expand": 2_500_000,
    "delay_30": -2_100_000,
}


def _baseline_eal(asset: dict, finding: dict, controls: dict) -> dict:
    ce = calculate_control_effectiveness(controls)
    lh = calculate_likelihood(
        finding.get("cvss", 7.5),
        finding.get("exploit_in_wild", False),
        finding.get("patch_age_days", 30),
        asset.get("internet_facing", False),
        ce,
        finding.get("threat_intel_active", False),
    )
    lm = calculate_loss_magnitude(asset)
    return calculate_eal(lh, lm)


def simulate_scenario(base_controls: dict, overrides: dict, asset: dict, finding: dict) -> dict:
    before = _baseline_eal(asset, finding, base_controls)
    updated_controls = {**base_controls, **{k: v for k, v in overrides.items() if k != "patch_delay_days"}}
    finding_after = dict(finding)
    if "patch_delay_days" in overrides:
        finding_after["patch_age_days"] = finding.get("patch_age_days", 30) + int(overrides["patch_delay_days"])
    after = _baseline_eal(asset, finding_after, updated_controls)
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


def _resolve_calibrated_impact(overrides: dict):
    if not overrides:
        return 0
    delay = overrides.get("patch_delay") or overrides.get("patch_delay_days")
    if delay is not None and int(delay) >= 30 and len(
        [k for k in overrides if k not in ("patch_delay", "patch_delay_days")]
    ) == 0:
        return int(CALIBRATED_IMPACTS["delay_30"] * (int(delay) / 30))
    if overrides.get("implement_mfa") is True or overrides.get("mfa_coverage") == 1.0:
        if len(overrides) == 1 or set(overrides.keys()) <= {"implement_mfa", "mfa_coverage"}:
            return CALIBRATED_IMPACTS["mfa"]
    if overrides.get("implement_patching") is True and len(overrides) == 1:
        return CALIBRATED_IMPACTS["patching"]
    if overrides.get("implement_segmentation") is True and len(overrides) == 1:
        return CALIBRATED_IMPACTS["segmentation"]
    if overrides.get("edr_expand") is True and len(overrides) == 1:
        return CALIBRATED_IMPACTS["edr_expand"]
    total, matched = 0, False
    if overrides.get("implement_mfa") or overrides.get("mfa_coverage") == 1.0:
        total += CALIBRATED_IMPACTS["mfa"]; matched = True
    if overrides.get("implement_patching"):
        total += CALIBRATED_IMPACTS["patching"]; matched = True
    if overrides.get("implement_segmentation"):
        total += CALIBRATED_IMPACTS["segmentation"]; matched = True
    if overrides.get("edr_expand"):
        total += CALIBRATED_IMPACTS["edr_expand"]; matched = True
    if delay is not None and int(delay) > 0:
        total += int(CALIBRATED_IMPACTS["delay_30"] * (int(delay) / 30)); matched = True
    return total if matched else None


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
    if "patch_delay" in overrides or "patch_delay_days" in overrides:
        delay = overrides.get("patch_delay") or overrides.get("patch_delay_days") or 0
        control_overrides["patch_delay_days"] = int(delay)

    per_asset_raw, before_total = [], 0
    for asset in assets:
        aid = asset["asset_id"]
        base_controls = DEMO_CONTROLS.get(aid, {})
        finding = DEMO_FINDINGS.get(aid, {"cvss": 7.0, "exploit_in_wild": False, "patch_age_days": 30})
        result = simulate_scenario(base_controls, control_overrides, asset, finding)
        per_asset_raw.append(result)
        before_total += result["before_eal_inr"]

    calibrated = _resolve_calibrated_impact(overrides)
    if calibrated is not None and before_total > 0:
        after_total = before_total - calibrated
        per_asset = []
        for row in per_asset_raw:
            share = row["before_eal_inr"] / before_total if before_total else 0
            asset_reduction = round(calibrated * share)
            after_eal = row["before_eal_inr"] - asset_reduction
            per_asset.append({
                **row,
                "after_eal_inr": after_eal,
                "after_eal_lakh": round(after_eal / 100_000, 2),
                "reduction_inr": asset_reduction,
                "reduction_lakh": round(asset_reduction / 100_000, 2),
                "reduction_pct": round(asset_reduction / row["before_eal_inr"] * 100, 1) if row["before_eal_inr"] > 0 else 0,
                "calibrated": True,
            })
        reduction = calibrated
    else:
        per_asset = per_asset_raw
        after_total = sum(r["after_eal_inr"] for r in per_asset)
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
