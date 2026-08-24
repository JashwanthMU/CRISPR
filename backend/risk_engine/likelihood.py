"""Threat likelihood model - returns probability 0.0-1.0"""


def calculate_likelihood(
    cvss: float,
    exploit_in_wild: bool,
    patch_age_days: int,
    internet_facing: bool,
    control_effectiveness: float,
    threat_intel_active: bool,
) -> float:
    score = 0.0
    score += (cvss / 10) * 0.25
    score += (0.95 if exploit_in_wild else 0.3) * 0.20
    score += min(patch_age_days / 90, 1.0) * 0.15
    score += (0.95 if internet_facing else 0.3) * 0.15
    score += (1 - control_effectiveness) * 0.15
    score += (0.85 if threat_intel_active else 0.2) * 0.10
    return round(min(score, 0.95), 3)