"""Budget optimizer tool — the AI's access to the budget optimizer knapsack."""

from backend.optimizer.knapsack import optimize_budget as _optimize_budget

DEFAULT_BUDGET_INR = 10_000_000


def optimize_investment(budget_inr: float = DEFAULT_BUDGET_INR, organization_id=None) -> dict:
    if budget_inr <= 0:
        raise ValueError("budget_inr must be positive")
    return _optimize_budget(float(budget_inr), organization_id=organization_id)


def list_controls(organization_id) -> list[dict]:
    from backend.data_access import load_control_catalog

    return load_control_catalog(organization_id=organization_id)
