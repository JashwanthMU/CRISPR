"""
*** TEMPORARY PLACEHOLDER ***
Owned by ishwarya. File was empty, breaking main.py's import of assets.router.
Minimal stub so the app boots end-to-end; Member 2 replaces with real router.
"""
from fastapi import APIRouter
import json
from pathlib import Path

router = APIRouter()
ASSETS_PATH = Path(__file__).resolve().parents[3] / "data" / "demo" / "assets.json"


@router.get("")
def get_assets():
    assets = json.load(open(ASSETS_PATH)) if ASSETS_PATH.exists() else []
    return {"total": len(assets), "assets": assets}


@router.get("/{asset_id}")
def get_asset(asset_id: str):
    assets = json.load(open(ASSETS_PATH)) if ASSETS_PATH.exists() else []
    return next((a for a in assets if a["asset_id"] == asset_id), {"error": "not found"})