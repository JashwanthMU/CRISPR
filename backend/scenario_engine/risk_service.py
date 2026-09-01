from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude, calculate_eal
from backend.controls.effectiveness import calculate_control_effectiveness

def calculate_baseline(asset: dict, finding: dict, controls: dict) -> dict:
    ce = calculate_control_effectiveness(controls)
    lh_dict = calculate_likelihood(
        finding.get("cvss", 7.5),
        finding.get("exploit_in_wild", False),
        finding.get("patch_age_days", 30),
        asset.get("internet_facing", False),
        ce,
        finding.get("threat_intel_active", False),
    )
    lm = calculate_loss_magnitude(asset)
    return calculate_eal(lh_dict["incident_probability"], lm)
