from uuid import UUID

import pytest

from backend.app.api.ingestion import FrequencyIngestionRequest
from backend.financial_engine.loss_calculator import calculate_eal
from backend.scenario_engine import risk_service


def test_frequency_request_requires_bounded_probability_and_evidence():
    valid = FrequencyIngestionRequest.model_validate({
        "source_name": "FAIR workshop 2026-Q3",
        "assessments": [{
            "finding_id": "NVD-1",
            "annual_incident_probability": 0.12,
            "methodology": "FAIR calibrated expert estimate",
            "evidence_reference": "GRC-FAIR-2026-Q3-0042",
            "confidence": 0.8,
            "observed_at": "2026-09-01T00:00:00Z",
            "valid_until": "2026-12-01T00:00:00Z",
        }],
    })
    assert valid.assessments[0].annual_incident_probability == 0.12
    with pytest.raises(ValueError):
        FrequencyIngestionRequest.model_validate({
            "source_name": "FAIR workshop",
            "assessments": [{
                **valid.assessments[0].model_dump(),
                "annual_incident_probability": 1.01,
            }],
        })


def test_live_financial_baseline_uses_evidenced_frequency_not_kev(monkeypatch):
    monkeypatch.setattr(risk_service, "demo_mode_enabled", lambda: False)
    monkeypatch.setattr(risk_service, "calculate_control_effectiveness", lambda controls: 0.5)
    asset = {
        "asset_id": "A1", "type": "SERVER", "criticality": 5,
        "data_sensitivity": 3, "value_inr": 1_000_000,
        "downtime_cost_per_hour_inr": 10_000, "regulatory_exposure_inr": 0,
        "expected_downtime_hours": 8, "incident_response_cost_inr": 200_000,
        "recovery_cost_inr": 300_000, "data_breach_exposure_inr": 0,
        "reputation_exposure_inr": 50_000,
    }
    finding = {
        "finding_id": "F1", "annual_incident_probability": 0.2,
        "frequency_evidence": {
            "assessment_id": UUID("00000000-0000-0000-0000-000000000042"),
            "evidence_reference": "FAIR-42",
        },
    }
    result = risk_service.calculate_baseline(asset, finding, {})
    assert result["likelihood"] == 0.2
    assert result["eal_calculation"]["annual_incident_probability"] == 0.2
    assert result["likelihood_calculation"]["calculation"]["evidence_reference"] == "FAIR-42"


def test_eal_rejects_invalid_probability_and_exposes_formula():
    with pytest.raises(ValueError):
        calculate_eal(1.1, {"total_inr": 100})
    result = calculate_eal(0.25, {"total_inr": 400})
    assert result["eal_inr"] == 100
    assert result["eal_calculation"]["formula"] == "annual_incident_probability * loss_magnitude_inr"
