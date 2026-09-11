from backend.services.delivery_risk import calculate_delivery_risk


def test_estimate_overrun_increases_exposure_and_expected_loss():
    result = calculate_delivery_risk(
        planned_days=7, likely_days=30, annual_incident_probability=0.18,
        loss_magnitude_inr=20_000_000, potential_risk_reduction_inr=3_100_000,
    )
    assert result["forecast_days"] == 30
    assert result["additional_exposure_days"] == 23
    assert result["delay_attributable_loss_inr"] > 0
    assert result["risk_reduction_at_risk_inr"] == 3_100_000


def test_qualified_backup_reduces_absence_impact():
    common = dict(
        planned_days=7, likely_days=7, absence_days=20,
        annual_incident_probability=0.18, loss_magnitude_inr=20_000_000,
    )
    without_backup = calculate_delivery_risk(**common, backup_available=False)
    with_backup = calculate_delivery_risk(**common, backup_available=True)
    assert with_backup["forecast_days"] < without_backup["forecast_days"]
    assert with_backup["delay_attributable_loss_inr"] < without_backup["delay_attributable_loss_inr"]


def test_capability_gap_changes_forecast_not_employee_health():
    result = calculate_delivery_risk(
        planned_days=7, likely_days=7, capability_status="TRAINING_REQUIRED",
        availability_pct=50, annual_incident_probability=0.1,
        loss_magnitude_inr=1_000_000,
    )
    assert result["forecast_days"] == 21
    assert "medical" not in result
