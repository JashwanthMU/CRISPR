"""Evidence-based remediation delivery-delay calculations."""

from math import pow


CAPABILITY_MULTIPLIERS = {
    "READY": 1.0,
    "READY_WITH_REVIEW": 1.15,
    "TRAINING_REQUIRED": 1.5,
    "SPECIALIST_REQUIRED": 1.8,
    "UNKNOWN": 1.25,
}


def calculate_delivery_risk(
    *, planned_days: int, likely_days: int, absence_days: int = 0,
    availability_pct: float = 100, capability_status: str = "READY",
    annual_incident_probability: float, loss_magnitude_inr: float,
    potential_risk_reduction_inr: float = 0, realized_risk_reduction_inr: float = 0,
    backup_available: bool = False,
) -> dict:
    """Return transparent delay exposure and expected-loss estimates."""
    availability = max(0.05, min(1.0, availability_pct / 100))
    capability = CAPABILITY_MULTIPLIERS.get(capability_status, CAPABILITY_MULTIPLIERS["UNKNOWN"])
    absence = max(0, absence_days)
    if backup_available:
        absence = round(absence * 0.25)
    forecast_days = max(1, round((max(1, likely_days) * capability) / availability) + absence)
    delay_days = max(0, forecast_days - max(1, planned_days))
    annual_probability = max(0.0, min(1.0, annual_incident_probability))

    def period_probability(days: int) -> float:
        return 1 - pow(1 - annual_probability, max(0, days) / 365)

    planned_probability = period_probability(planned_days)
    forecast_probability = period_probability(forecast_days)
    planned_loss = planned_probability * max(0, loss_magnitude_inr)
    forecast_loss = forecast_probability * max(0, loss_magnitude_inr)
    at_risk = max(0, potential_risk_reduction_inr - realized_risk_reduction_inr)
    return {
        "planned_days": planned_days,
        "forecast_days": forecast_days,
        "additional_exposure_days": delay_days,
        "planned_period_probability": round(planned_probability, 8),
        "forecast_period_probability": round(forecast_probability, 8),
        "planned_expected_loss_inr": round(planned_loss),
        "forecast_expected_loss_inr": round(forecast_loss),
        "delay_attributable_loss_inr": round(max(0, forecast_loss - planned_loss)),
        "potential_risk_reduction_inr": round(max(0, potential_risk_reduction_inr)),
        "realized_risk_reduction_inr": round(max(0, realized_risk_reduction_inr)),
        "risk_reduction_at_risk_inr": round(at_risk),
        "capability_status": capability_status,
        "backup_available": backup_available,
        "formula": "P(period)=1-(1-P(annual))^(days/365); expected_loss=P(period)*loss_magnitude",
    }
