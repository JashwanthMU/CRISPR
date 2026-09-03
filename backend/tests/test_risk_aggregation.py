import pytest

from backend.app.api.risks import _aggregate_asset_risks
from backend.app.api.risks import get_enterprise_summary
from backend.app.api.scenarios import _simulate


def test_findings_on_same_asset_do_not_double_count_full_asset_loss():
    rows = [
        {"asset_id": "A1", "asset_name": "Asset", "likelihood": 0.10, "loss_magnitude_inr": 1_000_000},
        {"asset_id": "A1", "asset_name": "Asset", "likelihood": 0.20, "loss_magnitude_inr": 1_000_000},
    ]
    result = _aggregate_asset_risks(rows)
    assert len(result) == 1
    assert result[0]["likelihood"] == pytest.approx(0.28)
    assert result[0]["eal_inr"] == 280_000
    assert result[0]["finding_count"] == 2


def test_different_assets_remain_separate_loss_events():
    rows = [
        {"asset_id": "A1", "asset_name": "One", "likelihood": 0.10, "loss_magnitude_inr": 1_000_000},
        {"asset_id": "A2", "asset_name": "Two", "likelihood": 0.20, "loss_magnitude_inr": 2_000_000},
    ]
    result = _aggregate_asset_risks(rows)
    assert len(result) == 2
    assert sum(row["eal_inr"] for row in result) == 500_000


def test_scenario_baseline_equals_enterprise_risk_baseline():
    enterprise = get_enterprise_summary()
    scenario = _simulate({})
    assert scenario["before_total_eal_inr"] == enterprise["total_eal_inr"]
    assert scenario["after_total_eal_inr"] == enterprise["total_eal_inr"]
