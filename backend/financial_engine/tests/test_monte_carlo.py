from backend.financial_engine.monte_carlo import run_monte_carlo

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
