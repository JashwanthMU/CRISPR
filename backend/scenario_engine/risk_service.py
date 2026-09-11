from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude, calculate_eal
from backend.controls.effectiveness import calculate_control_effectiveness
from backend.data_access import LiveDataUnavailable, demo_mode_enabled
from backend.risk_engine.likelihood import _extend_exposure_probability

def calculate_baseline(
    asset: dict,
    finding: dict,
    controls: dict,
    patch_delay_days: int = 0,
    reference_control_effectiveness: float | None = None,
) -> dict:
    ce = calculate_control_effectiveness(controls)
    if demo_mode_enabled():
        # Use the same likelihood pipeline as the enterprise risk endpoint so
        # an unchanged scenario has exactly the same financial baseline. The
        # likelihood helper retains its deterministic rule fallback when the
        # calibrated demo artifact is unavailable.
        lh_dict = calculate_likelihood(
            cvss=finding.get("cvss", 7.5),
            exploit_in_wild=finding.get("exploit_in_wild", False),
            patch_age_days=finding.get("patch_age_days", 30),
            internet_facing=asset.get("internet_facing", False),
            control_effectiveness=ce,
            threat_intel_active=finding.get("threat_intel_active", False),
            patch_delay_days=patch_delay_days,
            model_features=finding,
        )
    else:
        base_probability = finding.get("annual_incident_probability")
        evidence = finding.get("frequency_evidence")
        if base_probability is None or not evidence:
            raise LiveDataUnavailable(
                f"Finding {finding.get('finding_id')} lacks a current annual incident-frequency assessment"
            )
        reference_ce = ce if reference_control_effectiveness is None else reference_control_effectiveness
        if reference_control_effectiveness is None:
            before_delay = float(base_probability)
        else:
            reference_residual = max(1.0 - 0.6 * reference_ce, 0.01)
            scenario_residual = max(1.0 - 0.6 * ce, 0.01)
            before_delay = min(max(float(base_probability) * scenario_residual / reference_residual, 0.0), 1.0)
        probability = _extend_exposure_probability(before_delay, patch_delay_days)
        lh_dict = {
            "incident_probability": probability,
            "likelihood_semantics": "scenario derived from organization-supplied annual incident probability",
            "calculation": {
                "assessment_id": str(evidence["assessment_id"]),
                "base_annual_incident_probability": float(base_probability),
                "reference_control_effectiveness": reference_ce,
                "scenario_control_effectiveness": ce,
                "control_residual_formula": "p * (1 - 0.6 * scenario_ce) / (1 - 0.6 * reference_ce)",
                "probability_before_delay": before_delay,
                "patch_delay_days": patch_delay_days,
                "delay_formula": "1 - (1 - p) ** (1 + delay_days / 365)",
                "evidence_reference": evidence["evidence_reference"],
            },
        }
    lm = calculate_loss_magnitude(asset)
    result = calculate_eal(lh_dict["incident_probability"], lm)
    result["likelihood_calculation"] = lh_dict
    return result
