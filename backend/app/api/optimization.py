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
def optimize_get(budget: float = Query(10_000_000)):
    return optimize_budget(float(budget))


@router.get("/controls")
def list_controls():
    return {
        "controls": CONTROLS,
        "count": len(CONTROLS),
        "total_catalogue_cost_inr": sum(c["cost_inr"] for c in CONTROLS),
        "total_catalogue_reduction_inr": sum(c["risk_reduction_inr"] for c in CONTROLS),
    }


@router.get('/recommend')
def recommend_quick_wins():
    """Top 3 quick wins under 50L budget — for dashboard cards."""
    from backend.optimizer.knapsack import CONTROLS
    quick_wins = [c for c in CONTROLS if c['cost_inr'] <= 5_000_000]
    ranked = sorted(quick_wins, key=lambda c: c['risk_reduction_inr'] / c['cost_inr'], reverse=True)[:3]
    return {
        'quick_wins': [
            {
                **c,
                'cost_lakh': round(c['cost_inr'] / 100_000, 1),
                'reduction_lakh': round(c['risk_reduction_inr'] / 100_000, 1),
                'roi_ratio': round(c['risk_reduction_inr'] / c['cost_inr'], 2),
            }
            for c in ranked
        ],
        'total_cost_lakh': round(sum(c['cost_inr'] for c in ranked) / 100_000, 1),
        'total_reduction_lakh': round(sum(c['risk_reduction_inr'] for c in ranked) / 100_000, 1),
    }
