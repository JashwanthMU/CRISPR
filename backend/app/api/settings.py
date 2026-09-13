"""Persistent tenant settings."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from backend.app.auth import AuthUser, require_security
from backend.repositories import platform
from backend.services.audit import record_audit_event

router = APIRouter()


class SettingsUpdate(BaseModel):
    expected_version: int = Field(ge=0)
    org_name: str | None = Field(default=None, min_length=2, max_length=160)
    alert_email: EmailStr | None = None
    notify_critical: bool | None = None
    notify_weekly: bool | None = None


@router.get("")
def get_settings(user: AuthUser = Depends(require_security)) -> dict:
    row = platform.get_settings(user.organization_id)
    return {**row["settings"], "version": row["version"], "updated_at": row["updated_at"]}


@router.patch("")
def update_settings(body: SettingsUpdate, user: AuthUser = Depends(require_security)) -> dict:
    changes = body.model_dump(exclude={"expected_version"}, exclude_none=True)
    row = platform.update_settings(user.organization_id, changes, body.expected_version)
    if not row:
        raise HTTPException(status_code=409, detail="Settings version conflict")
    record_audit_event(user.organization_id, user.user_id, "settings.update", "organization", str(user.organization_id), {"fields": sorted(changes)})
    return {**row["settings"], "version": row["version"], "updated_at": row["updated_at"]}
