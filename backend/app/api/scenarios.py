"""Scenario simulation API. Member 5."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from backend.app.auth import AuthUser, require_security
from typing import Optional
from backend.scenario_engine.simulator import simulate_enterprise, PRESET_SCENARIOS
from backend.data_access import load_assets
from backend.services.delivery_risk import calculate_delivery_risk

router = APIRouter()


class DeliveryScenarioRequest(BaseModel):
    planned_days: int = Field(default=7, ge=1, le=730)
    likely_days: int = Field(default=30, ge=1, le=730)
    absence_days: int = Field(default=0, ge=0, le=365)
    availability_pct: float = Field(default=100, gt=0, le=100)
    capability_status: str = Field(default="READY", pattern="^(READY|READY_WITH_REVIEW|TRAINING_REQUIRED|SPECIALIST_REQUIRED|UNKNOWN)$")
    annual_incident_probability: float = Field(default=0.18, gt=0, le=1)
    loss_magnitude_inr: float = Field(default=20_000_000, gt=0)
    potential_risk_reduction_inr: float = Field(default=3_100_000, ge=0)
    realized_risk_reduction_inr: float = Field(default=0, ge=0)
    backup_available: bool = False


def _load_assets(organization_id=None) -> list:
    return load_assets(organization_id=organization_id)


def _simulate(overrides: dict, organization_id=None) -> dict:
    return simulate_enterprise(_load_assets(organization_id), overrides, organization_id=organization_id)


@router.get("")
def run_scenario(
    implement_mfa: Optional[bool] = Query(None),
    implement_patching: Optional[bool] = Query(None),
    implement_segmentation: Optional[bool] = Query(None),
    edr_expand: Optional[bool] = Query(None),
    patch_delay: Optional[int] = Query(None),
    mfa_coverage: Optional[float] = Query(None, ge=0, le=1),
    edr_coverage: Optional[float] = Query(None, ge=0, le=1),
    patch_compliance: Optional[float] = Query(None, ge=0, le=1),
    segmentation_coverage: Optional[float] = Query(None, ge=0, le=1),
    logging_coverage: Optional[float] = Query(None, ge=0, le=1),
    waf_enabled: Optional[bool] = Query(None),
    user: AuthUser = Depends(require_security),
):
    overrides = {}
    if implement_mfa is not None: overrides["implement_mfa"] = implement_mfa
    if implement_patching is not None: overrides["implement_patching"] = implement_patching
    if implement_segmentation is not None: overrides["implement_segmentation"] = implement_segmentation
    if edr_expand is not None: overrides["edr_expand"] = edr_expand
    if patch_delay is not None: overrides["patch_delay"] = patch_delay
    if mfa_coverage is not None: overrides["mfa_coverage"] = mfa_coverage
    if edr_coverage is not None: overrides["edr_coverage"] = edr_coverage
    if patch_compliance is not None: overrides["patch_compliance"] = patch_compliance
    if segmentation_coverage is not None: overrides["segmentation_coverage"] = segmentation_coverage
    if logging_coverage is not None: overrides["logging_coverage"] = logging_coverage
    if waf_enabled is not None: overrides["waf_enabled"] = waf_enabled
    result = _simulate(overrides, user.organization_id)
    result["total_eal_inr"] = result["after_total_eal_inr"]
    result["total_eal_lakh"] = result["after_total_eal_lakh"]
    return result


@router.get("/presets")
def list_presets(user: AuthUser = Depends(require_security)):
    enriched = []
    for preset in PRESET_SCENARIOS:
        sim = _simulate(preset["params"], user.organization_id)
        cost, reduction = preset["cost_inr"], sim["reduction_inr"]
        if cost > 0 and reduction > 0:
            rosi = round((reduction - cost) / cost, 2)
            rosi_pct = round(rosi * 100)
        else:
            rosi, rosi_pct = None, None
        enriched.append({
            **preset,
            "before_eal_inr": sim["before_total_eal_inr"],
            "before_eal_lakh": sim["before_total_eal_lakh"],
            "after_eal_inr": sim["after_total_eal_inr"],
            "after_eal_lakh": sim["after_total_eal_lakh"],
            "reduction_inr": reduction,
            "reduction_lakh": sim["reduction_lakh"],
            "reduction_pct": sim["reduction_pct"],
            "cost_lakh": round(cost / 100_000, 1),
            "rosi": rosi,
            "rosi_pct": rosi_pct,
        })
    return {"presets": enriched, "count": len(enriched)}


@router.get('/compare')
def compare_scenarios(
    s1: str = Query(..., description='First scenario id: mfa | patch_now | segment | delay_30'),
    s2: str = Query(..., description='Second scenario id: mfa | patch_now | segment | delay_30'),
    user: AuthUser = Depends(require_security),
):
    """Compare two scenarios side by side."""
    p1 = next((p for p in PRESET_SCENARIOS if p["id"] == s1), None)
    p2 = next((p for p in PRESET_SCENARIOS if p["id"] == s2), None)
    errors = []
    if not p1: errors.append(f"Unknown scenario '{s1}'")
    if not p2: errors.append(f"Unknown scenario '{s2}'")
    if errors:
        raise HTTPException(
            status_code=404,
            detail={"errors": errors, "available": [p["id"] for p in PRESET_SCENARIOS]},
        )
    assets = _load_assets(user.organization_id)
    r1 = simulate_enterprise(assets, p1["params"], organization_id=user.organization_id)
    r2 = simulate_enterprise(assets, p2["params"], organization_id=user.organization_id)
    winner = s1 if r1["reduction_inr"] >= r2["reduction_inr"] else s2
    return {
        "scenario_1": {
            "id": s1, "name": p1["name"],
            "cost_inr": p1["cost_inr"],
            "cost_lakh": round(p1["cost_inr"] / 100_000, 1),
            "reduction_inr": r1["reduction_inr"],
            "reduction_lakh": r1["reduction_lakh"],
            "before_eal_lakh": r1["before_total_eal_lakh"],
            "after_eal_lakh": r1["after_total_eal_lakh"],
            "rosi": round((r1["reduction_inr"] - p1["cost_inr"]) / p1["cost_inr"], 2) if p1["cost_inr"] > 0 else None,
        },
        "scenario_2": {
            "id": s2, "name": p2["name"],
            "cost_inr": p2["cost_inr"],
            "cost_lakh": round(p2["cost_inr"] / 100_000, 1),
            "reduction_inr": r2["reduction_inr"],
            "reduction_lakh": r2["reduction_lakh"],
            "before_eal_lakh": r2["before_total_eal_lakh"],
            "after_eal_lakh": r2["after_total_eal_lakh"],
            "rosi": round((r2["reduction_inr"] - p2["cost_inr"]) / p2["cost_inr"], 2) if p2["cost_inr"] > 0 else None,
        },
        "winner": winner,
        "difference_lakh": round((r1["reduction_inr"] - r2["reduction_inr"]) / 100_000, 2),
    }


@router.post("/delivery-risk")
def run_delivery_scenario(body: DeliveryScenarioRequest, user: AuthUser = Depends(require_security)) -> dict:
    """Model delay loss from availability, estimate and capability evidence."""
    return calculate_delivery_risk(**body.model_dump())

@router.get("/{scenario_id}")
def run_preset(scenario_id: str, user: AuthUser = Depends(require_security)):
    preset = next((p for p in PRESET_SCENARIOS if p["id"] == scenario_id), None)
    if not preset:
        raise HTTPException(
            status_code=404,
            detail={
                "error": f"Unknown scenario '{scenario_id}'",
                "available": [p["id"] for p in PRESET_SCENARIOS],
            },
        )
    result = _simulate(preset["params"], user.organization_id)
    return {"scenario": preset, **result}
