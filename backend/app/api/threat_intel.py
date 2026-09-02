from fastapi import APIRouter
from backend.data_access import require_demo_mode

router = APIRouter()

THREAT_ACTORS = [
    {"id": "ta-001", "name": "APT-Nexus", "origin": "Unknown", "motivation": "Financial",
     "targets": ["APAC payment infrastructure"], "confidence": "High",
     "last_activity": "2026-08-20", "ttps": ["T1566", "T1078", "T1486"]},
    {"id": "ta-002", "name": "ShadowLoader", "origin": "Eastern Europe", "motivation": "Ransomware",
     "targets": ["Financial services databases"], "confidence": "Medium",
     "last_activity": "2026-08-14", "ttps": ["T1486", "T1490"]},
    {"id": "ta-003", "name": "CredStuffer Collective", "origin": "Unknown", "motivation": "Credential theft",
     "targets": ["Authentication endpoints"], "confidence": "Medium",
     "last_activity": "2026-08-05", "ttps": ["T1110", "T1078"]},
]

CAMPAIGNS = [
    {"id": "c-001", "name": "Operation PayBreak", "actor": "APT-Nexus",
     "status": "Active", "first_seen": "2026-07-01", "targets": ["A003", "A001"]},
    {"id": "c-002", "name": "DBRansom-APAC", "actor": "ShadowLoader",
     "status": "Active", "first_seen": "2026-08-01", "targets": ["A002"]},
]

@router.get("")
def list_threat_intel():
    require_demo_mode("Threat intelligence catalogue")
    return {
        "actors":    THREAT_ACTORS,
        "campaigns": CAMPAIGNS,
        "actor_count":    len(THREAT_ACTORS),
        "campaign_count":  len(CAMPAIGNS),
        "active_campaigns": len([c for c in CAMPAIGNS if c["status"] == "Active"]),
    }

@router.get("/actors")
def list_actors():
    require_demo_mode("Threat actors")
    return {"actors": THREAT_ACTORS, "count": len(THREAT_ACTORS)}

@router.get("/campaigns")
def list_campaigns():
    require_demo_mode("Threat campaigns")
    return {"campaigns": CAMPAIGNS, "count": len(CAMPAIGNS)}

@router.get("/actors/{actor_id}")
def get_actor(actor_id: str):
    require_demo_mode("Threat actors")
    from fastapi import HTTPException
    actor = next((a for a in THREAT_ACTORS if a["id"] == actor_id), None)
    if not actor:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    return actor
