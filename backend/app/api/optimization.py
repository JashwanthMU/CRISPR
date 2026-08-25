"""Budget optimizer API. Member 5."""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional
from backend.optimizer.knapsack import optimize_budget, CONTROLS

router = APIRouter()


class OptimizeRequest(BaseModel):
    budget_inr: float = Field(..., gt=0)
    budget: Optional[float] = None


@router.post("")
def optimize(body: OptimizeRequest):
    budget = body.budget_inr or body.budget or 10_000_000
    return optimize_budget(float(budget))


@router.get("")
def optimize_get(budget: float = Query(10_000_000, gt=0)):
    return optimize_budget(float(budget))


@router.get("/controls")
def list_controls():
    return {
        "controls": CONTROLS,
        "count": len(CONTROLS),
        "total_catalogue_cost_inr": sum(c["cost_inr"] for c in CONTROLS),
        "total_catalogue_reduction_inr": sum(c["risk_reduction_inr"] for c in CONTROLS),
    }


@router.get("/recommend")
def recommend_quick_wins(max_budget_inr: int = Query(5_000_000, gt=0)):
    """
    Top 3 controls by ROI (risk_reduction / cost) that individually
    fit under max_budget_inr (default ₹50L). For a dashboard 'quick
    wins' card — doesn't require the user to size a full portfolio.
    """
    affordable = [c for c in CONTROLS if c["cost_inr"] <= max_budget_inr]
    ranked = sorted(
        affordable,
        key=lambda c: c["risk_reduction_inr"] / c["cost_inr"],
        reverse=True,
    )
    top3 = ranked[:3]

    return {
        "max_budget_inr": max_budget_inr,
        "max_budget_lakh": round(max_budget_inr / 100_000, 2),
        "recommendations": [
            {
                **c,
                "cost_lakh": round(c["cost_inr"] / 100_000, 2),
                "risk_reduction_lakh": round(c["risk_reduction_inr"] / 100_000, 2),
                "roi": round(c["risk_reduction_inr"] / c["cost_inr"], 2),
            }
            for c in top3
        ],
    }
