import math


def _extend_exposure_probability(probability: float, extra_days: int) -> float:
    """Compound a probability over an explicitly longer exposure window.

    This does not claim that patch age is an XGBoost feature. It answers the
    narrower scenario question: if the current hazard remains constant, what
    is the probability across one year plus ``extra_days`` of exposure?
    """
    if extra_days < 0:
        raise ValueError("patch_delay_days cannot be negative")
    if extra_days == 0 or probability in (0.0, 1.0):
        return probability
    return 1.0 - math.pow(1.0 - probability, 1.0 + extra_days / 365.0)


def calculate_likelihood(
    cvss,
    exploit_in_wild,
    patch_age_days,
    internet_facing,
    control_effectiveness,
    threat_intel_active,
    patch_delay_days=0,
    model_features=None,
) -> dict:
    """Return an explicitly labelled annual-frequency assumption for demos.

    This deterministic scenario input is deliberately independent of the
    XGBoost CVE exploitation-priority model. Live financial calculations do
    not call this helper: they require a current, approved frequency
    assessment from the organization.
    """
    return _rule_based_likelihood_fallback(
        cvss, exploit_in_wild, patch_age_days, internet_facing,
        control_effectiveness, threat_intel_active, patch_delay_days,
    )

def _rule_based_likelihood_fallback(
    cvss, exploit_in_wild, patch_age_days, internet_facing,
    control_effectiveness, threat_intel_active, patch_delay_days=0,
):
    score = 0.0
    score += (cvss / 10) * 0.25
    score += (0.95 if exploit_in_wild else 0.3) * 0.20
    score += min(patch_age_days / 90, 1.0) * 0.15
    score += (0.95 if internet_facing else 0.3) * 0.15
    score += (1 - control_effectiveness) * 0.15
    score += (0.85 if threat_intel_active else 0.2) * 0.10
    score = round(min(max(score, 0.02), 0.95), 3)
    probability = _extend_exposure_probability(score, int(patch_delay_days))
    return {
        "ranking_score": score,
        "incident_probability": probability,
        "calibration_available": False,
        "likelihood_semantics": "deterministic SIH demo annual incident-frequency assumption",
        "calculation": {
            "source_type": "scenario_assumption",
            "source_name": "CRISPR SIH golden demo dataset",
            "confidence": "DEMO_ONLY",
            "approved_for_live_use": False,
            "formula": "weighted CVSS, exploitation, patch age, exposure, controls, and threat intelligence",
            "probability_before_delay": score,
            "patch_delay_days": int(patch_delay_days),
            "delay_formula": "1 - (1 - p) ** (1 + delay_days / 365)",
        },
    }
