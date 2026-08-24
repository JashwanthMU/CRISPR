"""Incident probability predictor — rule-based V1, XGBoost-ready V2. Member 4.

predict_incident(features) -> {"probability": float, "contributions": dict}

V1 is a transparent additive weight model: each feature contributes an
evidence-backed slice of the final probability and all contributions sum
exactly to it. No training. V2 can swap in a fitted XGBoost model behind
the same function signature (see ml/explainability/shap_wrapper.py).
"""

from typing import Optional

MODEL_NAME = "rule_based_v1"

MAX_PROBABILITY = 0.95
MIN_PROBABILITY = 0.02

WEIGHTS = {
    "exploit_availability": 0.30,
    "network_exposure": 0.20,
    "patch_latency": 0.20,
    "control_weakness": 0.15,
    "severity": 0.15,
}


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _feature_contributions(
    cvss: float,
    exploit_in_wild: bool,
    patch_age_days: int,
    internet_facing: bool,
    control_effectiveness: float,
) -> dict:
    ce = _clamp(float(control_effectiveness), 0.0, 1.0)
    return {
        "exploit_availability": WEIGHTS["exploit_availability"] if exploit_in_wild else WEIGHTS["exploit_availability"] * 0.2,
        "network_exposure": WEIGHTS["network_exposure"] if internet_facing else WEIGHTS["network_exposure"] * 0.25,
        "patch_latency": WEIGHTS["patch_latency"] * _clamp(patch_age_days / 90.0, 0.0, 1.0),
        "control_weakness": WEIGHTS["control_weakness"] * (1.0 - ce),
        "severity": WEIGHTS["severity"] * _clamp(cvss / 10.0, 0.0, 1.0),
    }


def predict_incident(
    cvss: float,
    exploit_in_wild: bool,
    patch_age_days: int,
    internet_facing: bool,
    control_effectiveness: float,
) -> dict:
    contributions = _feature_contributions(
        cvss=cvss,
        exploit_in_wild=exploit_in_wild,
        patch_age_days=patch_age_days,
        internet_facing=internet_facing,
        control_effectiveness=control_effectiveness,
    )
    raw = sum(contributions.values())
    probability = _clamp(raw, MIN_PROBABILITY, MAX_PROBABILITY)

    rounded = {name: round(score, 3) for name, score in contributions.items()}
    rounding_gap = round(probability - sum(rounded.values()), 3)
    if abs(rounding_gap) > 0:
        top = max(rounded, key=rounded.get)
        rounded[top] = round(rounded[top] + rounding_gap, 3)

    return {
        "probability": round(probability, 3),
        "contributions": rounded,
        "model": MODEL_NAME,
    }


def predict_incident_from_risk_row(risk_row: dict) -> Optional[dict]:
    """Build features from a Member 3 risk row (asset-level risk case)."""
    try:
        return predict_incident(
            cvss=float(risk_row.get("cvss", risk_row.get("risk_score", 7.5))),
            exploit_in_wild=bool(risk_row.get("exploit_in_wild", False)),
            patch_age_days=int(risk_row.get("patch_age_days", 30)),
            internet_facing=bool(risk_row.get("internet_facing", False)),
            control_effectiveness=float(risk_row.get("control_effectiveness_pct", 50.0)) / 100.0,
        )
    except (TypeError, ValueError):
        return None
