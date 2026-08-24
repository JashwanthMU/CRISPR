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
