"""Durable remediation workflow with optimistic concurrency and event history."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.repositories import platform
from backend.services.audit import record_audit_event

router = APIRouter()
VALID_STATUSES = {"NOT_STARTED", "IN_PROGRESS", "PR_OPENED", "RESOLVED"}


class RemediationCreate(BaseModel):
    title: str = Field(min_length=2, max_length=240)
    finding_id: str | None = Field(default=None, max_length=64)
    asset_id: str | None = Field(default=None, max_length=32)
    priority: str = Field(pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    recommended_fix: str | None = Field(default=None, max_length=10000)
    risk_reduction_inr: float | None = Field(default=None, ge=0)
    metadata: dict = Field(default_factory=dict)


class StatusUpdate(BaseModel):
    status: str
    expected_version: int = Field(ge=1)


class AssignRequest(BaseModel):
    owner_name: str = Field(min_length=1, max_length=120)
    owner_initials: str = Field(min_length=1, max_length=8)
    owner_team: str = Field(min_length=1, max_length=120)
    expected_version: int = Field(ge=1)


def _summary(items: list[dict]) -> dict:
    open_items = [item for item in items if item["status"] != "RESOLVED"]
    pending = sum(float(item.get("riskReductionInr") or 0) for item in open_items)
    return {
        "total": len(items), "open": len(open_items),
        "in_progress": sum(item["status"] == "IN_PROGRESS" for item in items),
        "resolved": sum(item["status"] == "RESOLVED" for item in items),
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
