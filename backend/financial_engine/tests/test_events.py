import pytest
from pydantic import ValidationError

from backend.financial_engine.events import EventPortfolio, RiskEvent, simulate_events


def event(**overrides):
    return RiskEvent(**{ "event_id": "outage", "category": "service_outage",
        "annual_probability": 1, "mean_loss_inr": 1000,
        "loss_coefficient_of_variation": 0,
        "frequency_evidence": "approved frequency assessment", "loss_evidence": "approved loss assessment",
        **overrides})


def test_deterministic_loss_and_full_control():
    report = simulate_events(EventPortfolio(events=[event(control_probability_reduction=1, control_evidence="verified")]))
    assert report["baseline"]["analytic_eal_inr"] == 1000
    assert report["baseline"]["simulated_mean_inr"] == 1000
    assert report["residual"]["var_99_inr"] == 0


def test_shared_shocks_are_simultaneous():
    one = event(annual_probability=0.2, shock_group="shared")
    two = event(event_id="breach", annual_probability=0.2, shock_group="shared")
    report = simulate_events(EventPortfolio(events=[one, two]))
    assert report["baseline"]["var_95_inr"] == 2000
    assert report == simulate_events(EventPortfolio(events=[two, one]))


def test_evidence_and_duplicate_validation():
    with pytest.raises(ValidationError):
        event(control_probability_reduction=0.5)
    with pytest.raises(ValidationError):
        EventPortfolio(events=[event(), event()])
    with pytest.raises(ValidationError):
        event(mean_loss_inr=float("nan"))


def test_sparse_tail_does_not_average_all_zeros():
    report = simulate_events(EventPortfolio(events=[event(annual_probability=0.01)]))
    assert report["baseline"]["var_95_inr"] == 0
    assert report["baseline"]["expected_shortfall_95_inr"] > report["baseline"]["simulated_mean_inr"]
