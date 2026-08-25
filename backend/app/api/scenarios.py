"""Scenario simulation API. Member 5."""

from fastapi import APIRouter, Query
from typing import Optional
import json
from pathlib import Path
from backend.scenario_engine.simulator import simulate_enterprise, PRESET_SCENARIOS

router = APIRouter()


def _load_assets() -> list:
    path = Path("data/demo/assets.json")
    if not path.exists():
        path = Path(__file__).resolve().parents[3] / "data" / "demo" / "assets.json"
    with open(path) as f:
        return json.load(f)


@router.get("")
def run_scenario(
    implement_mfa: Optional[bool] = Query(None),
    implement_patching: Optional[bool] = Query(None),
    implement_segmentation: Optional[bool] = Query(None),
    edr_expand: Optional[bool] = Query(None),
    patch_delay: Optional[int] = Query(None, ge=0, le=365, description="Days to delay patching (0-365)"),
    mfa_coverage: Optional[float] = Query(None, ge=0.0, le=1.0),
):
    overrides = {}
    if implement_mfa is not None: overrides["implement_mfa"] = implement_mfa
    if implement_patching is not None: overrides["implement_patching"] = implement_patching
    if implement_segmentation is not None: overrides["implement_segmentation"] = implement_segmentation
    if edr_expand is not None: overrides["edr_expand"] = edr_expand
    if patch_delay is not None: overrides["patch_delay"] = patch_delay
    if mfa_coverage is not None: overrides["mfa_coverage"] = mfa_coverage
    assets = _load_assets()
    result = simulate_enterprise(assets, overrides)
    result["total_eal_inr"] = result["after_total_eal_inr"]
    result["total_eal_lakh"] = result["after_total_eal_lakh"]
    return result


@router.get("/presets")
def list_presets():
    assets = _load_assets()
    enriched = []
    for preset in PRESET_SCENARIOS:
        sim = simulate_enterprise(assets, preset["params"])
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


@router.get("/compare")
def compare_scenarios(
    scenario_a: str = Query(..., description="Preset id, e.g. 'mfa'"),
    scenario_b: str = Query(..., description="Preset id, e.g. 'patch_now'"),
):
    """Side-by-side comparison of two preset scenarios by id."""
    presets = {p["id"]: p for p in PRESET_SCENARIOS}
    if scenario_a not in presets or scenario_b not in presets:
        return {"error": f"Unknown scenario id(s). Available: {list(presets.keys())}"}

    assets = _load_assets()
    result_a = simulate_enterprise(assets, presets[scenario_a]["params"])
    result_b = simulate_enterprise(assets, presets[scenario_b]["params"])

    return {
        "scenario_a": {"id": scenario_a, "name": presets[scenario_a]["name"], **result_a},
        "scenario_b": {"id": scenario_b, "name": presets[scenario_b]["name"], **result_b},
        "reduction_delta_lakh": round(result_a["reduction_lakh"] - result_b["reduction_lakh"], 2),
    }


@router.get("/{scenario_id}")
def run_preset(scenario_id: str):
    preset = next((p for p in PRESET_SCENARIOS if p["id"] == scenario_id), None)
    if not preset:
        return {"error": f"Unknown scenario '{scenario_id}'", "available": [p["id"] for p in PRESET_SCENARIOS]}
    assets = _load_assets()
    result = simulate_enterprise(assets, preset["params"])
    return {"scenario": preset, **result}
