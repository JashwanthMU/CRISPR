"""Scenario simulation API. Member 5."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.scenario_engine.simulator import simulate_enterprise, PRESET_SCENARIOS
from backend.data_access import load_assets

router = APIRouter()


def _load_assets() -> list:
    return load_assets()


def _simulate(overrides: dict) -> dict:
    return simulate_enterprise(_load_assets(), overrides)


@router.get("")
def run_scenario(
    implement_mfa: Optional[bool] = Query(None),
    implement_patching: Optional[bool] = Query(None),
    implement_segmentation: Optional[bool] = Query(None),
    edr_expand: Optional[bool] = Query(None),
    patch_delay: Optional[int] = Query(None),
    mfa_coverage: Optional[float] = Query(None),
):
    overrides = {}
    if implement_mfa is not None: overrides["implement_mfa"] = implement_mfa
    if implement_patching is not None: overrides["implement_patching"] = implement_patching
    if implement_segmentation is not None: overrides["implement_segmentation"] = implement_segmentation
    if edr_expand is not None: overrides["edr_expand"] = edr_expand
    if patch_delay is not None: overrides["patch_delay"] = patch_delay
    if mfa_coverage is not None: overrides["mfa_coverage"] = mfa_coverage
    result = _simulate(overrides)
    result["total_eal_inr"] = result["after_total_eal_inr"]
    result["total_eal_lakh"] = result["after_total_eal_lakh"]
    return result


@router.get("/presets")
def list_presets():
    enriched = []
    for preset in PRESET_SCENARIOS:
        sim = _simulate(preset["params"])
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
    assets = _load_assets()
    r1 = simulate_enterprise(assets, p1["params"])
    r2 = simulate_enterprise(assets, p2["params"])
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

@router.get("/{scenario_id}")
def run_preset(scenario_id: str):
    preset = next((p for p in PRESET_SCENARIOS if p["id"] == scenario_id), None)
    if not preset:
        raise HTTPException(
            status_code=404,
            detail={
                "error": f"Unknown scenario '{scenario_id}'",
                "available": [p["id"] for p in PRESET_SCENARIOS],
            },
        )
    result = _simulate(preset["params"])
    return {"scenario": preset, **result}
