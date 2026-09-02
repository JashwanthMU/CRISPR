from backend.optimizer.knapsack import optimize_budget

def test_optimize_budget():
    budget = 5000000
    res = optimize_budget(budget)
    assert res["spent_inr"] <= budget
    assert "selected_controls" in res
    assert res["rosi"] is not None
    assert res["rosi"] >= 0
    assert all(control["marginal_rosi"] >= 0 for control in res["selected_controls"])
