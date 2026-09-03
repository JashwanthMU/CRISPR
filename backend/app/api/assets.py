from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.auth import AuthUser, require_security
from backend.data_access import load_assets, load_findings

from backend.asset_intelligence.criticality import (
    enrich_asset,
    calculate_business_criticality,
)
from backend.controls.effectiveness import (
    calculate_control_effectiveness,
    get_controls_for_asset,
)
from backend.correlation.correlator import correlate_findings
from backend.normalization.normalizer import normalize_all
from backend.app.api.findings import get_findings_by_asset

router = APIRouter()


def _asset_name_lookup(assets: list[dict]) -> dict:
    return {a["asset_id"]: a.get("name", a["asset_id"]) for a in assets}


@router.get("")
def get_assets(limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0), user: AuthUser = Depends(require_security)):
    assets = []
    for asset in load_assets(user.organization_id):
        enriched = enrich_asset(asset)
        controls = get_controls_for_asset(asset["asset_id"], user.organization_id)
        enriched["control_effectiveness"] = calculate_control_effectiveness(controls)
        enriched["control_effectiveness_pct"] = round(enriched["control_effectiveness"] * 100, 1)
        enriched["controls"] = controls
        assets.append(enriched)
    return {"total": len(assets), "limit": limit, "offset": offset, "assets": assets[offset:offset + limit]}


@router.get("/{asset_id}/controls")
def get_asset_controls(asset_id: str, user: AuthUser = Depends(require_security)):
    controls = get_controls_for_asset(asset_id, user.organization_id)
    return {"asset_id": asset_id, "controls": controls}


@router.get("/{asset_id}")
def get_asset(asset_id: str, user: AuthUser = Depends(require_security)):
    assets = load_assets(user.organization_id)
    asset = next((a for a in assets if a["asset_id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="asset not found")

    enriched = enrich_asset(asset)
    controls = get_controls_for_asset(asset_id, user.organization_id)
    enriched["control_effectiveness"] = calculate_control_effectiveness(controls)
    enriched["controls"] = controls

    return enriched


@router.get("/{asset_id}/risk-cases")
def get_asset_risk_cases(asset_id: str, user: AuthUser = Depends(require_security)):
    assets = load_assets(user.organization_id)
    asset_record = next((a for a in assets if a["asset_id"] == asset_id), None)
    if not asset_record:
        raise HTTPException(status_code=404, detail="asset not found")

    raw_findings = [row for row in load_findings(organization_id=user.organization_id) if row.get("asset_id") == asset_id]
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
