
from fastapi import APIRouter
import json
from pathlib import Path

from backend.controls.effectiveness import DEMO_CONTROLS

router = APIRouter()
ASSETS_PATH = Path(__file__).resolve().parents[3] / "data" / "demo" / "assets.json"


@router.get("")
def get_assets():
    assets = json.load(open(ASSETS_PATH)) if ASSETS_PATH.exists() else []
    return {"total": len(assets), "assets": assets}


@router.get("/{asset_id}/controls")
def get_asset_controls(asset_id: str):
    controls = DEMO_CONTROLS.get(asset_id)
    if controls is None:
        return {"error": "no controls data for this asset"}, 404
    return {"asset_id": asset_id, "controls": controls}


@router.get("/{asset_id}")
def get_asset(asset_id: str):
    assets = json.load(open(ASSETS_PATH)) if ASSETS_PATH.exists() else []
    return next((a for a in assets if a["asset_id"] == asset_id), {"error": "not found"})