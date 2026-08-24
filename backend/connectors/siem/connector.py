"""SIEM connector backed by the demo JSON dataset."""

import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[3] / "data/demo/siem_events.json"


def fetch_findings() -> list[dict]:
    with DATA_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def get_source_info() -> dict:
    return {"name": "SIEM", "status": "connected", "count": len(fetch_findings())}
