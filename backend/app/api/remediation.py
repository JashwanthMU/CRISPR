"""Durable remediation workflow with optimistic concurrency and event history."""

from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.repositories import platform
from backend.services.audit import record_audit_event
from backend.services.delivery_risk import calculate_delivery_risk

router = APIRouter()
VALID_STATUSES = {"NOT_STARTED", "IN_PROGRESS", "PR_OPENED", "BLOCKED", "AT_RISK", "RESOLVED", "VERIFIED"}


class RemediationCreate(BaseModel):
    ticket_key: str | None = Field(default=None, max_length=64)
    title: str = Field(min_length=2, max_length=240)
    finding_id: str | None = Field(default=None, max_length=64)
    asset_id: str | None = Field(default=None, max_length=32)
    priority: str = Field(pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    recommended_fix: str | None = Field(default=None, max_length=10000)
    risk_reduction_inr: float | None = Field(default=None, ge=0)
    realized_risk_reduction_inr: float = Field(default=0, ge=0)
    planned_due_at: datetime | None = None
    forecast_due_at: datetime | None = None
    estimated_effort_hours: float | None = Field(default=None, ge=0)
    remaining_effort_hours: float | None = Field(default=None, ge=0)
    capability_status: str = Field(default="UNKNOWN", pattern="^(READY|READY_WITH_REVIEW|TRAINING_REQUIRED|SPECIALIST_REQUIRED|UNKNOWN)$")
    owner: dict | None = None
    backup_owner: dict | None = None
    metadata: dict = Field(default_factory=dict)


class StatusUpdate(BaseModel):
    status: str
    expected_version: int = Field(ge=1)


class AssignRequest(BaseModel):
    owner_name: str = Field(min_length=1, max_length=120)
    owner_initials: str = Field(min_length=1, max_length=8)
    owner_team: str = Field(min_length=1, max_length=120)
    expected_version: int = Field(ge=1)


class DeliveryIssueCreate(BaseModel):
    issue_type: str = Field(pattern="^(UNPLANNED_ABSENCE|MEDICAL_EMERGENCY|WORKLOAD_CONFLICT|SKILL_GAP|DEPENDENCY_BLOCKED|APPROVAL_BLOCKED|VENDOR_DELAY|ENVIRONMENT_UNAVAILABLE|ESTIMATE_INCORRECT|PERSONAL_EMERGENCY|OTHER)$")
    availability_impact: str = Field(pattern="^(NONE|REDUCED|UNAVAILABLE)$")
    expected_resolution_at: datetime | None = None
    reassignment_allowed: bool = True
    note: str | None = Field(default=None, max_length=500, description="Operational impact only; do not include medical details")


class DeliveryRiskRequest(BaseModel):
    planned_days: int = Field(ge=1, le=730)
    likely_days: int = Field(ge=1, le=730)
    absence_days: int = Field(default=0, ge=0, le=365)
    availability_pct: float = Field(default=100, gt=0, le=100)
    capability_status: str = Field(default="READY", pattern="^(READY|READY_WITH_REVIEW|TRAINING_REQUIRED|SPECIALIST_REQUIRED|UNKNOWN)$")
    annual_incident_probability: float = Field(gt=0, le=1)
    loss_magnitude_inr: float = Field(gt=0)
    potential_risk_reduction_inr: float = Field(default=0, ge=0)
    realized_risk_reduction_inr: float = Field(default=0, ge=0)
    backup_available: bool = False


def _summary(items: list[dict]) -> dict:
    open_items = [item for item in items if item["status"] not in {"RESOLVED", "VERIFIED"}]
    pending = sum(float(item.get("riskReductionInr") or 0) for item in open_items)
    return {
        "total": len(items), "open": len(open_items),
        "in_progress": sum(item["status"] == "IN_PROGRESS" for item in items),
        "resolved": sum(item["status"] in {"RESOLVED", "VERIFIED"} for item in items),
        "pending_risk_inr": pending, "pending_risk_lakh": round(pending / 100_000, 2),
    }


@router.get("")
def list_remediation(
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: AuthUser = Depends(require_security),
) -> dict:
    items = platform.list_remediation(user.organization_id, limit, offset)
    return {"summary": _summary(items), "items": items, "count": len(items), "limit": limit, "offset": offset}


@router.get("/stats/summary")
def remediation_summary(user: AuthUser = Depends(require_security)) -> dict:
    return _summary(platform.list_remediation(user.organization_id, 200, 0))


@router.post("", status_code=201)
def create_remediation(body: RemediationCreate, user: AuthUser = Depends(require_security)) -> dict:
    row = platform.create_remediation(user.organization_id, user.user_id, body.model_dump())
    record_audit_event(user.organization_id, user.user_id, "remediation.create", "remediation", str(row["id"]))
    return row


def _apply_update(item_id: UUID, expected: int, user: AuthUser, *, status: str | None = None, owner: dict | None = None) -> dict:
    previous, current = platform.update_remediation(user.organization_id, item_id, expected, status, owner)
    if not previous:
        raise HTTPException(status_code=404, detail="Remediation item not found")
    if not current:
        raise HTTPException(status_code=409, detail={"error": "Version conflict", "current_version": previous["version"]})
    event_type = "STATUS_CHANGED" if status else "ASSIGNED"
    with get_connection() as db:
        from psycopg.types.json import Jsonb
        from uuid import uuid4
        db.execute(
            """INSERT INTO remediation_events(event_id,remediation_id,organization_id,event_type,actor_id,previous,current)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (uuid4(), item_id, user.organization_id, event_type, user.user_id, Jsonb(previous), Jsonb(current)),
        )
    record_audit_event(user.organization_id, user.user_id, f"remediation.{event_type.lower()}", "remediation", str(item_id))
    return current


@router.patch("/{item_id}")
def update_status(item_id: UUID, body: StatusUpdate, user: AuthUser = Depends(require_security)) -> dict:
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status; expected one of {sorted(VALID_STATUSES)}")
    return _apply_update(item_id, body.expected_version, user, status=body.status)


@router.post("/{item_id}/assign")
def assign_item(item_id: UUID, body: AssignRequest, user: AuthUser = Depends(require_security)) -> dict:
    owner = {"name": body.owner_name, "initials": body.owner_initials, "team": body.owner_team}
    return _apply_update(item_id, body.expected_version, user, owner=owner)


@router.get("/{item_id}/issues")
def list_delivery_issues(item_id: UUID, user: AuthUser = Depends(require_security)) -> dict:
    with get_connection() as db:
        exists = db.execute("SELECT 1 FROM remediation_items WHERE remediation_id=%s AND organization_id=%s", (item_id, user.organization_id)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Remediation item not found")
        rows = db.execute(
            """SELECT issue_id AS id,issue_type,availability_impact,expected_resolution_at,
                      reassignment_allowed,note,status,created_at,resolved_at
               FROM remediation_delivery_issues WHERE remediation_id=%s AND organization_id=%s
               ORDER BY created_at DESC""", (item_id, user.organization_id),
        ).fetchall()
    return {"issues": rows, "count": len(rows)}


@router.post("/{item_id}/issues", status_code=201)
def report_delivery_issue(item_id: UUID, body: DeliveryIssueCreate, user: AuthUser = Depends(require_security)) -> dict:
    with get_connection() as db:
        exists = db.execute("SELECT 1 FROM remediation_items WHERE remediation_id=%s AND organization_id=%s", (item_id, user.organization_id)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Remediation item not found")
        row = db.execute(
            """INSERT INTO remediation_delivery_issues(issue_id,organization_id,remediation_id,issue_type,
                      availability_impact,expected_resolution_at,reassignment_allowed,note,reported_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING issue_id AS id,issue_type,availability_impact,expected_resolution_at,
                         reassignment_allowed,note,status,created_at""",
            (uuid4(), user.organization_id, item_id, body.issue_type, body.availability_impact,
             body.expected_resolution_at, body.reassignment_allowed, body.note, user.user_id),
        ).fetchone()
        db.execute(
            """UPDATE remediation_items SET status='AT_RISK',version=version+1,updated_at=NOW()
               WHERE remediation_id=%s AND organization_id=%s AND status NOT IN ('RESOLVED','VERIFIED')""",
            (item_id, user.organization_id),
        )
    record_audit_event(user.organization_id, user.user_id, "remediation.delivery_issue_reported", "remediation", str(item_id))
    return row


@router.post("/{item_id}/delivery-risk")
def forecast_delivery_risk(item_id: UUID, body: DeliveryRiskRequest, user: AuthUser = Depends(require_security)) -> dict:
    with get_connection() as db:
        item = db.execute("SELECT remediation_id FROM remediation_items WHERE remediation_id=%s AND organization_id=%s", (item_id, user.organization_id)).fetchone()
    if not item:
        raise HTTPException(status_code=404, detail="Remediation item not found")
    return calculate_delivery_risk(**body.model_dump())
