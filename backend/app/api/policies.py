"""Durable tenant-scoped policy API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.auth import AuthUser, require_security
from backend.repositories import platform
from backend.services.audit import record_audit_event

router = APIRouter()


class PolicyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=5000)
    framework: str | None = Field(default=None, max_length=80)
    framework_ref: str | None = Field(default=None, max_length=80)
    severity: str = Field(default="MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    auto_remediate: bool = False


class VersionRequest(BaseModel):
    expected_version: int = Field(ge=1)


@router.get("")
def list_policies(
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    user: AuthUser = Depends(require_security),
) -> dict:
    rows = platform.list_policies(user.organization_id, limit, offset)
    return {
        "policies": rows, "count": len(rows),
        "enabled_count": sum(bool(row["enabled"]) for row in rows),
        "disabled_count": sum(not row["enabled"] for row in rows),
        "limit": limit, "offset": offset,
    }


@router.get("/{policy_id}")
def get_policy(policy_id: UUID, user: AuthUser = Depends(require_security)) -> dict:
    row = next(
        (item for item in platform.list_policies(user.organization_id, 200, 0) if item["id"] == policy_id),
        None,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")
    return row


@router.post("", status_code=201)
def create_policy(body: PolicyCreate, user: AuthUser = Depends(require_security)) -> dict:
    row = platform.create_policy(user.organization_id, user.user_id, body.model_dump())
    record_audit_event(user.organization_id, user.user_id, "policy.create", "policy", str(row["id"]))
    return row


@router.patch("/{policy_id}/toggle")
def toggle_policy(
    policy_id: UUID, body: VersionRequest, user: AuthUser = Depends(require_security),
) -> dict:
    row = platform.toggle_policy(user.organization_id, policy_id, body.expected_version)
    if not row:
        raise HTTPException(status_code=409, detail="Policy version conflict or policy not found")
    record_audit_event(
        user.organization_id, user.user_id, "policy.toggle", "policy", str(policy_id),
        {"enabled": row["enabled"], "version": row["version"]},
    )
    return {**row, "message": f"Policy {'enabled' if row['enabled'] else 'disabled'} successfully"}
