"""Investment optimizer — PuLP integer programming + greedy fallback. Member 5."""

CONTROLS = [
    {"id": "mfa", "name": "MFA for all privileged accounts", "cost_inr": 1_500_000, "risk_reduction_inr": 4_860_000, "complexity": "Low", "time_weeks": 2},
    {"id": "patching", "name": "Emergency patch deployment", "cost_inr": 800_000, "risk_reduction_inr": 3_100_000, "complexity": "Medium", "time_weeks": 1},
    {"id": "segmentation", "name": "Network micro-segmentation", "cost_inr": 3_000_000, "risk_reduction_inr": 3_870_000, "complexity": "High", "time_weeks": 6},
    {"id": "edr_expand", "name": "EDR rollout to all endpoints", "cost_inr": 2_000_000, "risk_reduction_inr": 2_500_000, "complexity": "Medium", "time_weeks": 3},
    {"id": "cloud_hard", "name": "Cloud configuration hardening", "cost_inr": 1_500_000, "risk_reduction_inr": 1_800_000, "complexity": "Medium", "time_weeks": 2},
    {"id": "backup", "name": "Immutable backup implementation", "cost_inr": 600_000, "risk_reduction_inr": 900_000, "complexity": "Low", "time_weeks": 1},
    {"id": "training", "name": "Security awareness training", "cost_inr": 300_000, "risk_reduction_inr": 500_000, "complexity": "Low", "time_weeks": 2},
]


def _greedy_select(budget_inr: float) -> list:
    ranked = sorted(CONTROLS, key=lambda c: c["risk_reduction_inr"] / c["cost_inr"], reverse=True)
    selected, remaining = [], budget_inr
    for c in ranked:
        if c["cost_inr"] <= remaining:
            selected.append(c)
            remaining -= c["cost_inr"]
    return selected


def optimize_budget(budget_inr: float) -> dict:
    selected, solver_used = [], "greedy"
    try:
        from pulp import LpProblem, LpVariable, LpMaximize, lpSum, COIN_CMD
        prob.solve(COIN_CMD(msg=0))
        x = {c["id"]: LpVariable(c["id"], cat="Binary") for c in CONTROLS}
        prob += lpSum(x[c["id"]] * c["risk_reduction_inr"] for c in CONTROLS)
        prob += lpSum(x[c["id"]] * c["cost_inr"] for c in CONTROLS) <= budget_inr
        status = prob.solve(PULP_CBC_CMD(msg=0))
        if status == 1:
            selected = [c for c in CONTROLS if value(x[c["id"]]) == 1]
            solver_used = "pulp"
        else:
            selected = _greedy_select(budget_inr)
    except Exception:
        selected = _greedy_select(budget_inr)

    spent = sum(c["cost_inr"] for c in selected)
    total_reduction = sum(c["risk_reduction_inr"] for c in selected)
    rosi = round((total_reduction - spent) / spent, 2) if spent > 0 else 0
    baseline_eal = 25_000_000
    reduction_pct = round(total_reduction / baseline_eal * 100, 1) if baseline_eal else 0
    return {
        "budget_inr": budget_inr,
        "spent_inr": spent,
        "remaining_inr": budget_inr - spent,
        "selected_controls": selected,
        "total_reduction_inr": total_reduction,
        "total_reduction_lakh": round(total_reduction / 100_000, 2),
        "risk_reduced_inr": total_reduction,
        "total_risk_reduction_pct": reduction_pct,
        "rosi": rosi,
        "solver": solver_used,
    }
