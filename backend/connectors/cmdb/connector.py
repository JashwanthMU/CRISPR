"""CMDB connector backed by the shared asset inventory."""

import json
from pathlib import Path
from backend.data_access import demo_mode_enabled, load_assets


DATA_PATH = Path(__file__).resolve().parents[3] / "data/demo/assets.json"


def fetch_findings() -> list[dict]:
    return []


def get_source_info() -> dict:
    try:
        assets = load_assets()
    except Exception:
        return {"source": "CMDB", "name": "Asset CMDB", "status": "disconnected", "count": 0}
    return {"source": "CMDB", "name": "Asset CMDB", "status": "connected", "count": len(assets)}
