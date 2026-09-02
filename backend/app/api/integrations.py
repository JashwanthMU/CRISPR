"""
Integrations API — feat/platform-connections
GET  /api/integrations              → list integrations with live status
POST /api/integrations/{id}/reconnect → simulate reconnect
POST /api/integrations/{id}/disable   → disable integration
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from backend.data_access import demo_mode_enabled
from backend.ingestion.store import ingestion_status

router = APIRouter()

INTEGRATIONS = [
    {"id": "hackerone",   "name": "HackerOne",          "category": "Bug Bounty",     "key": "bug_bounty",            "status": "connected",    "last_sync": "2026-08-31T08:00:00Z", "items_ingested": 3},
    {"id": "bugcrowd",    "name": "Bugcrowd",            "category": "Bug Bounty",     "key": "bugcrowd",              "status": "connected",    "last_sync": "2026-08-31T08:00:00Z", "items_ingested": 1},
    {"id": "nessus",      "name": "Nessus",              "category": "Vuln Scanner",   "key": "vulnerability_scanner", "status": "connected",    "last_sync": "2026-08-31T06:00:00Z", "items_ingested": 18},
    {"id": "crowdstrike", "name": "CrowdStrike Falcon",  "category": "XDR",            "key": "xdr",                   "status": "connected",    "last_sync": "2026-08-31T07:30:00Z", "items_ingested": 12},
    {"id": "splunk",      "name": "Splunk SIEM",         "category": "SIEM",           "key": "siem",                  "status": "connected",    "last_sync": "2026-08-31T07:45:00Z", "items_ingested": 8},
    {"id": "okta",        "name": "Okta",                "category": "IAM",            "key": "iam",                   "status": "connected",    "last_sync": "2026-08-31T08:00:00Z", "items_ingested": 14},
    {"id": "wiz",         "name": "Wiz",                 "category": "CSPM",           "key": "cspm",                  "status": "connected",    "last_sync": "2026-08-31T07:00:00Z", "items_ingested": 9},
    {"id": "misp",        "name": "MISP",                "category": "Threat Intel",   "key": "threat_intel",          "status": "connected",    "last_sync": "2026-08-31T06:30:00Z", "items_ingested": 6},
    {"id": "servicenow",  "name": "ServiceNow CMDB",     "category": "CMDB",           "key": "cmdb",                  "status": "disconnected", "last_sync": None,                   "items_ingested": 0},
    {"id": "github",      "name": "GitHub",              "category": "Code Security",  "key": "github",                "status": "connected",    "last_sync": "2026-08-31T08:00:00Z", "items_ingested": 22},
]

_state: dict[str, dict] = {i["id"]: dict(i) for i in INTEGRATIONS}


@router.get("")
def list_integrations():
    items = [dict(item) for item in _state.values()]
    if not demo_mode_enabled():
        source_rows = {row["source_type"].lower(): row for row in ingestion_status()}
        for item in items:
            row = source_rows.get(item["key"])
            item["status"] = "connected" if row else "disconnected"
            item["last_sync"] = row["last_ingested_at"] if row else None
            item["items_ingested"] = row["count"] if row else 0
    connected    = [i for i in items if i["status"] == "connected"]
    disconnected = [i for i in items if i["status"] == "disconnected"]
    return {
        "integrations":       items,
        "count":              len(items),
        "connected_count":    len(connected),
        "disconnected_count": len(disconnected),
        "total_ingested":     sum(i["items_ingested"] for i in connected),
    }


@router.get("/{integration_id}")
def get_integration(integration_id: str):
    item = _state.get(integration_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Integration '{integration_id}' not found")
    return item


@router.post("/{integration_id}/reconnect")
def reconnect_integration(integration_id: str):
    item = _state.get(integration_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Integration '{integration_id}' not found")
    if not demo_mode_enabled():
        raise HTTPException(
            status_code=501,
            detail="A real connector credential and sync implementation is required; no simulated reconnect was performed",
        )
    _state[integration_id]["status"]        = "connected"
    _state[integration_id]["last_sync"]     = datetime.now(timezone.utc).isoformat()
    _state[integration_id]["items_ingested"] = max(1, _state[integration_id]["items_ingested"])
    return {
        "id":      integration_id,
        "status":  "connected",
        "message": f"{item['name']} reconnected successfully",
        "last_sync": _state[integration_id]["last_sync"],
    }


@router.post("/{integration_id}/disable")
def disable_integration(integration_id: str):
    item = _state.get(integration_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Integration '{integration_id}' not found")
    if not demo_mode_enabled():
        raise HTTPException(
            status_code=501,
            detail="Persistent integration configuration is required; no in-memory disable was performed",
        )
    _state[integration_id]["status"] = "disconnected"
    return {
        "id":      integration_id,
        "status":  "disconnected",
        "message": f"{item['name']} disabled successfully",
    }
