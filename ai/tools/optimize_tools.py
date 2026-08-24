"""Budget optimizer tool — the AI's access to the budget optimizer knapsack."""

from backend.optimizer.knapsack import optimize_budget as _optimize_budget

DEFAULT_BUDGET_INR = 10_000_000


def optimize_investment(budget_inr: float = DEFAULT_BUDGET_INR) -> dict:
    if budget_inr <= 0:
        raise ValueError("budget_inr must be positive")
    return _optimize_budget(float(budget_inr))


def list_controls() -> list[dict]:
    from backend.optimizer.knapsack import CONTROLS

    return CONTROLS
