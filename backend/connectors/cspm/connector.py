"""CSPM connector backed by an optional demo JSON dataset."""

import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[3] / "data/demo/cspm.json"


def fetch_findings() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    with DATA_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def get_source_info() -> dict:
    findings = fetch_findings()
    return {
        "source": "CSPM",
        "name": "Cloud Security Posture Management",
        "status": "connected" if DATA_PATH.exists() else "disconnected",
        "count": len(findings),
    }
