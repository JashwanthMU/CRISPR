from fastapi import APIRouter
import json
from pathlib import Path

from backend.asset_intelligence.criticality import (
    enrich_asset,
    calculate_business_criticality,
)
from backend.controls.effectiveness import (
    calculate_control_effectiveness,
    DEMO_CONTROLS,
)
from backend.correlation.correlator import correlate_findings
from backend.normalization.normalizer import normalize_all
from backend.app.api.findings import get_findings_by_asset

router = APIRouter()
ASSETS_PATH = Path(__file__).resolve().parents[3] / "data" / "demo" / "assets.json"


def load_assets():
    return json.load(open(ASSETS_PATH)) if ASSETS_PATH.exists() else []


def _asset_name_lookup(assets: list[dict]) -> dict:
    return {a["asset_id"]: a.get("name", a["asset_id"]) for a in assets}


@router.get("")
def get_assets():
    assets = [enrich_asset(a) for a in load_assets()]
    return {"total": len(assets), "assets": assets}


@router.get("/{asset_id}/controls")
def get_asset_controls(asset_id: str):
    controls = DEMO_CONTROLS.get(asset_id)
    if controls is None:
        return {"error": "no controls data for this asset"}, 404
    return {"asset_id": asset_id, "controls": controls}


@router.get("/{asset_id}")
def get_asset(asset_id: str):
    assets = load_assets()
    asset = next((a for a in assets if a["asset_id"] == asset_id), None)
    if not asset:
        return {"error": "not found"}

    enriched = enrich_asset(asset)
    controls = DEMO_CONTROLS.get(asset_id, {})
    enriched["control_effectiveness"] = calculate_control_effectiveness(controls)
    enriched["controls"] = controls

    return enriched


@router.get("/{asset_id}/risk-cases")
def get_asset_risk_cases(asset_id: str):
    assets = load_assets()
    asset_record = next((a for a in assets if a["asset_id"] == asset_id), None)
    if not asset_record:
        return {"error": "not found"}

    raw_findings = get_findings_by_asset(asset_id)
    normalized = normalize_all(raw_findings)
    asset_names = _asset_name_lookup(assets)

    risk_cases = correlate_findings(
        normalized,
        asset_names,
        criticality_lookup=lambda aid: calculate_business_criticality(asset_record),
    )

    return {
        "asset_id": asset_id,
        "risk_case_count": len(risk_cases),
        "risk_cases": [rc.model_dump() for rc in risk_cases],
    }