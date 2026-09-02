"""
Remediation Queue API — Member 5 / feat/platform-connections
GET  /api/remediation          → list all remediation items
PATCH /api/remediation/{id}    → update status
POST /api/remediation/{id}/assign → assign to owner
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
from pathlib import Path
from backend.data_access import require_demo_mode

router = APIRouter()

# ── Demo data derived from findings + risk engine ────────────────────────────
REMEDIATION_ITEMS = [
    {
        "id": "rem-001",
        "title": "Patch CVE-2024-21887 on Authentication API",
        "finding": "Remote code execution vulnerability actively exploited in the wild",
        "affectedResource": "A003 — Authentication API",
        "recommendedFix": "Apply vendor patch immediately. Pin Ivanti Connect Secure to patched version.",
        "priority": "CRITICAL",
        "estimatedEffort": "2 hours",
        "riskReductionInr": 3100000,
        "riskReductionLakh": 31.0,
        "owner": {"name": "Rahul Verma", "initials": "RV", "team": "Platform Infra"},
        "status": "NOT_STARTED",
        "repository": None,
        "branch": None,
        "source": "VULNERABILITY_SCANNER",
        "cve": "CVE-2024-21887",
        "sla_days": 1,
        "created_at": "2026-08-01",
    },
    {
        "id": "rem-002",
        "title": "Enable MFA on all privileged accounts",
        "finding": "12 privileged accounts without multi-factor authentication on Payment API",
        "affectedResource": "A003 — Authentication API (Okta)",
        "recommendedFix": "Enforce MFA policy on all privileged and admin roles across IAM.",
        "priority": "HIGH",
        "estimatedEffort": "1 day",
        "riskReductionInr": 4860000,
        "riskReductionLakh": 48.6,
        "owner": {"name": "Sara Kapoor", "initials": "SK", "team": "Identity"},
        "status": "IN_PROGRESS",
        "repository": None,
        "branch": None,
        "source": "IAM",
        "cve": None,
        "sla_days": 7,
        "created_at": "2026-08-01",
    },
    {
        "id": "rem-003",
        "title": "Patch CVE-2024-3400 on Payment Database",
        "finding": "SQL injection vulnerability with CVSS 10.0 on payment database",
        "affectedResource": "A002 — Payment Database",
        "recommendedFix": "Apply PAN-OS patch. Temporary workaround: disable GlobalProtect gateway.",
        "priority": "CRITICAL",
        "estimatedEffort": "4 hours",
        "riskReductionInr": 3100000,
        "riskReductionLakh": 31.0,
        "owner": {"name": "Arjun Mehta", "initials": "AM", "team": "Payments"},
        "status": "NOT_STARTED",
        "repository": None,
        "branch": None,
        "source": "VULNERABILITY_SCANNER",
        "cve": "CVE-2024-3400",
        "sla_days": 1,
        "created_at": "2026-08-05",
    },
    {
        "id": "rem-004",
        "title": "Fix authentication bypass on Payment API",
        "finding": "Authentication bypass allows unauthorized access — validated bug bounty finding",
        "affectedResource": "A003 — Authentication API",
        "recommendedFix": "Fix JWT validation logic. Rotate all active tokens post-fix.",
        "priority": "CRITICAL",
        "estimatedEffort": "1 day",
        "riskReductionInr": 4860000,
        "riskReductionLakh": 48.6,
        "owner": {"name": "Priya Nair", "initials": "PN", "team": "Security"},
        "status": "NOT_STARTED",
        "repository": "codesmiths/payments-service",
        "branch": "main",
        "source": "BUG_BOUNTY",
        "cve": None,
        "sla_days": 2,
        "created_at": "2026-08-10",
    },
    {
        "id": "rem-005",
        "title": "Implement network micro-segmentation",
        "finding": "Payment environment not fully segmented — lateral movement possible",
        "affectedResource": "A001, A002, A003 — Payment Environment",
        "recommendedFix": "Deploy network policies isolating payment services from rest of infrastructure.",
        "priority": "HIGH",
        "estimatedEffort": "1 week",
        "riskReductionInr": 3870000,
        "riskReductionLakh": 38.7,
        "owner": {"name": "Rahul Verma", "initials": "RV", "team": "Platform Infra"},
        "status": "NOT_STARTED",
        "repository": None,
        "branch": None,
        "source": "CSPM",
        "cve": None,
        "sla_days": 30,
        "created_at": "2026-08-01",
    },
    {
        "id": "rem-006",
        "title": "Remove admin rights from 8 service accounts",
        "finding": "8 service accounts with admin rights on Payment Gateway",
        "affectedResource": "A001 — Payment Gateway (Okta)",
        "recommendedFix": "Apply least-privilege principle. Replace admin roles with scoped service roles.",
        "priority": "MEDIUM",
        "estimatedEffort": "2 days",
        "riskReductionInr": 900000,
        "riskReductionLakh": 9.0,
        "owner": {"name": "Sara Kapoor", "initials": "SK", "team": "Identity"},
        "status": "IN_PROGRESS",
        "repository": None,
        "branch": None,
        "source": "IAM",
        "cve": None,
        "sla_days": 14,
        "created_at": "2026-08-01",
    },
]

# In-memory state (persists within server session)
_state: dict[str, dict] = {item["id"]: dict(item) for item in REMEDIATION_ITEMS}


class StatusUpdate(BaseModel):
    status: str

class AssignRequest(BaseModel):
    owner_name: str
    owner_initials: str
    owner_team: str


def _summary(items: list[dict]) -> dict:
    open_items   = [i for i in items if i["status"] != "RESOLVED"]
    in_progress  = [i for i in items if i["status"] == "IN_PROGRESS"]
    resolved     = [i for i in items if i["status"] == "RESOLVED"]
    pending_risk = sum(i["riskReductionInr"] for i in open_items)
    return {
        "total":            len(items),
        "open":             len(open_items),
        "in_progress":      len(in_progress),
        "resolved":         len(resolved),
        "pending_risk_inr": pending_risk,
        "pending_risk_lakh": round(pending_risk / 100_000, 2),
    }


@router.get("")
def list_remediation():
    require_demo_mode("Remediation")
    items = list(_state.values())
    return {
        "summary": _summary(items),
        "items":   items,
        "count":   len(items),
    }


def remediation_summary():
    items = list(_state.values())
    by_priority = {}
    for item in items:
        p = item["priority"]
        by_priority.setdefault(p, {"total": 0, "resolved": 0, "risk_inr": 0})
        by_priority[p]["total"] += 1
        by_priority[p]["risk_inr"] += item["riskReductionInr"]
        if item["status"] == "RESOLVED":
            by_priority[p]["resolved"] += 1
    return {
        **_summary(items),
        "by_priority": by_priority,
    }

@router.get("/stats/summary")
def remediation_summary():
    require_demo_mode("Remediation")
    items = list(_state.values())
    by_priority = {}
    for item in items:
        p = item["priority"]
        by_priority.setdefault(p, {"total": 0, "resolved": 0, "risk_inr": 0})
        by_priority[p]["total"] += 1
        by_priority[p]["risk_inr"] += item["riskReductionInr"]
        if item["status"] == "RESOLVED":
            by_priority[p]["resolved"] += 1
    open_items  = [i for i in items if i["status"] != "RESOLVED"]
    in_progress = [i for i in items if i["status"] == "IN_PROGRESS"]
    resolved    = [i for i in items if i["status"] == "RESOLVED"]
    pending     = sum(i["riskReductionInr"] for i in open_items)
    return {
        "total":             len(items),
        "open":              len(open_items),
        "in_progress":       len(in_progress),
        "resolved":          len(resolved),
        "pending_risk_inr":  pending,
        "pending_risk_lakh": round(pending / 100_000, 2),
        "by_priority":       by_priority,
    }

@router.get("/{item_id}")
def get_remediation_item(item_id: str):
    require_demo_mode("Remediation")
    item = _state.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Remediation item '{item_id}' not found")
    return item


@router.patch("/{item_id}")
def update_status(item_id: str, body: StatusUpdate):
    require_demo_mode("Remediation")
    valid = {"NOT_STARTED", "IN_PROGRESS", "PR_OPENED", "RESOLVED"}
    if body.status not in valid:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {valid}")
    item = _state.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Remediation item '{item_id}' not found")
    _state[item_id]["status"] = body.status
    return _state[item_id]


@router.post("/{item_id}/assign")
def assign_item(item_id: str, body: AssignRequest):
    require_demo_mode("Remediation")
    item = _state.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Remediation item '{item_id}' not found")
    _state[item_id]["owner"] = {
        "name":     body.owner_name,
        "initials": body.owner_initials,
        "team":     body.owner_team,
    }
    if _state[item_id]["status"] == "NOT_STARTED":
        _state[item_id]["status"] = "IN_PROGRESS"
    return _state[item_id]

