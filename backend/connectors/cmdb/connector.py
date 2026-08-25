"""CMDB connector backed by the shared asset inventory."""

import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[3] / "data/demo/assets.json"


def fetch_findings() -> list[dict]:
    return []


def get_source_info() -> dict:
    if not DATA_PATH.exists():
        return {"source": "CMDB", "name": "Asset CMDB", "status": "disconnected", "count": 0}
    with DATA_PATH.open(encoding="utf-8") as file:
        assets = json.load(file)
    return {"source": "CMDB", "name": "Asset CMDB", "status": "connected", "count": len(assets)}
