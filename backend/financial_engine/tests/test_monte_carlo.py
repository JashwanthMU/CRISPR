from backend.financial_engine.monte_carlo import run_monte_carlo
import pytest

def test_monte_carlo_seeded():
    data = [
        {"incident_probability": 0.1, "loss_magnitude_inr": 1000000},
        {"incident_probability": 0.5, "loss_magnitude_inr": 2000000}
    ]
    res1 = run_monte_carlo(data, num_simulations=1000, seed=42)
    res2 = run_monte_carlo(data, num_simulations=1000, seed=42)
    
    assert res1["mean_annual_loss"] > 0
    assert res1["var_95"] > 0
    assert res1["var_99"] >= res1["var_95"]
    assert res1["tail_value_at_risk_95"] >= res1["var_95"]
    assert res1 == res2 # deterministic seeded


def test_monte_carlo_mean_tracks_analytic_expected_loss():
    data = [
        {"incident_probability": 0.2, "loss_magnitude_inr": 1_000_000},
        {"incident_probability": 0.1, "loss_magnitude_inr": 2_000_000},
    ]
    result = run_monte_carlo(data, num_simulations=100_000, seed=7)
    expected = 400_000
    assert result["mean_annual_loss"] == pytest.approx(expected, rel=0.03)


@pytest.mark.parametrize("probability", [-0.1, 1.1])
def test_monte_carlo_rejects_invalid_probability(probability):
    with pytest.raises(ValueError):
        run_monte_carlo([
            {"incident_probability": probability, "loss_magnitude_inr": 1_000_000}
        ])
