"""Budget optimizer API. Member 5."""

from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import Optional
from backend.optimizer.knapsack import optimize_budget
from backend.scenario_engine.simulator import simulate_enterprise
from backend.app.api.risks import _load_assets
from backend.data_access import load_control_catalog
from backend.ingestion.store import upsert_control_catalog

router = APIRouter()


class OptimizeRequest(BaseModel):
    budget_inr: float = Field(..., gt=0)
    budget: Optional[float] = None
    minimum_marginal_rosi: float = Field(default=0.0, ge=-1.0)


class ControlInput(BaseModel):
    id: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9_-]+$")
    name: str = Field(min_length=2, max_length=160)
    cost_inr: float = Field(gt=0)
    complexity: str = Field(min_length=2, max_length=40)
    time_weeks: float = Field(gt=0)
    overrides: dict[str, bool | int | float]


class ControlCatalogueInput(BaseModel):
    source_name: str = Field(min_length=2, max_length=120)
    observed_at: datetime
    controls: list[ControlInput] = Field(min_length=1)


@router.post("")
def optimize(body: OptimizeRequest):
    budget = body.budget_inr or body.budget or 10_000_000
    return optimize_budget(float(budget), body.minimum_marginal_rosi)


@router.get("")
def optimize_get(budget: float = Query(10_000_000)):
    return optimize_budget(float(budget))


def _get_controls_with_reduction():
    assets = _load_assets()
    controls_with_reduction = []
    for c in load_control_catalog():
        res = simulate_enterprise(assets, c.get("overrides", {}))
        c_copy = dict(c)
        c_copy["risk_reduction_inr"] = res["reduction_inr"]
        controls_with_reduction.append(c_copy)
    return controls_with_reduction


@router.get("/controls")
def list_controls():
    controls_with_reduction = _get_controls_with_reduction()
    return {
        "controls": controls_with_reduction,
        "count": len(controls_with_reduction),
        "total_catalogue_cost_inr": sum(c["cost_inr"] for c in controls_with_reduction),
        "total_catalogue_reduction_inr": sum(c["risk_reduction_inr"] for c in controls_with_reduction),
    }


@router.post("/controls", status_code=201)
def replace_controls(body: ControlCatalogueInput):
    controls = [control.model_dump() for control in body.controls]
    count = upsert_control_catalog(
        controls,
        source_name=body.source_name,
        observed_at=body.observed_at,
        data_origin="LIVE",
    )
    return {
        "ingested": count,
        "data_origin": "LIVE",
        "source_name": body.source_name,
        "observed_at": body.observed_at,
    }


@router.get('/recommend')
def recommend_quick_wins():
    """Top 3 quick wins under 50L budget — for dashboard cards."""
    controls_with_reduction = _get_controls_with_reduction()
    quick_wins = [c for c in controls_with_reduction if c['cost_inr'] <= 5_000_000]
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
