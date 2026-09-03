"""Durable external integration configuration and synchronization API."""

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, SecretStr

from backend.app.auth import AuthUser, require_security
from backend.connectors.github import GitHubConnector
from backend.repositories import platform
from backend.security.secrets import decrypt_credentials, encrypt_credentials
from backend.services.audit import record_audit_event

router = APIRouter()


class GitHubIntegrationCreate(BaseModel):
    provider: Literal["github"] = "github"
    name: str = Field(min_length=2, max_length=160)
    token: SecretStr
    organization: str | None = Field(default=None, max_length=120)
    sync_interval_minutes: int = Field(default=60, ge=5, le=10080)


def _public(row: dict) -> dict:
    result = dict(row)
    result.pop("encrypted_credentials", None)
    return result


@router.get("")
def integrations(user: AuthUser = Depends(require_security)):
    items = [_public(row) for row in platform.list_integrations(user.organization_id)]
    connected = sum(item["status"] == "connected" for item in items)
    return {"integrations": items, "count": len(items), "connected_count": connected,
            "disconnected_count": len(items) - connected}


@router.post("", status_code=status.HTTP_201_CREATED)
def configure(body: GitHubIntegrationCreate, user: AuthUser = Depends(require_security)):
    token = body.token.get_secret_value()
    try:
        verification = GitHubConnector(token, body.organization).validate_credentials()
    except RuntimeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    config = {"organization": body.organization, "sync_interval_minutes": body.sync_interval_minutes,
              "verified_account": verification.account}
    try:
        row = platform.create_integration(
            user.organization_id, body.provider, body.name, config, encrypt_credentials({"token": token})
        )
    except Exception as error:
        if "unique" in str(error).lower():
            raise HTTPException(status_code=409, detail="An integration with this provider and name already exists") from error
        raise
    row = platform.set_integration_state(
        user.organization_id, row["id"], status="connected", last_verified_at=datetime.now(timezone.utc)
    )
    record_audit_event(user.organization_id, user.user_id, "integration.created", "integration", str(row["id"]))
    return _public(row)


@router.get("/{integration_id}")
def get_one(integration_id: UUID, user: AuthUser = Depends(require_security)):
    row = platform.get_integration(user.organization_id, integration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    return _public(row)


@router.post("/{integration_id}/reconnect")
def reconnect(integration_id: UUID, user: AuthUser = Depends(require_security)):
    row = platform.get_integration(user.organization_id, integration_id, include_secret=True)
    if not row or not row.get("encrypted_credentials"):
        raise HTTPException(status_code=404, detail="Integration or credentials not found")
    if row["provider"] != "github":
        raise HTTPException(status_code=501, detail=f"Provider {row['provider']} is not implemented")
    credentials = decrypt_credentials(row["encrypted_credentials"])
    try:
        result = GitHubConnector(credentials["token"], row["config"].get("organization")).healthcheck()
    except RuntimeError as error:
        platform.set_integration_state(user.organization_id, integration_id, status="error", last_error=str(error))
        raise HTTPException(status_code=400, detail=str(error)) from error
    updated = platform.set_integration_state(
        user.organization_id, integration_id, enabled=True, status="connected", last_error=None,
        last_verified_at=datetime.now(timezone.utc),
    )
    record_audit_event(user.organization_id, user.user_id, "integration.verified", "integration", str(integration_id))
    return {**_public(updated), "message": result.message, "account": result.account}


@router.post("/{integration_id}/disable")
def disable(integration_id: UUID, user: AuthUser = Depends(require_security)):
    row = platform.delete_integration_credentials(user.organization_id, integration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    record_audit_event(user.organization_id, user.user_id, "integration.disabled", "integration", str(integration_id))
    return row


@router.post("/{integration_id}/sync", status_code=status.HTTP_202_ACCEPTED)
def sync(integration_id: UUID, user: AuthUser = Depends(require_security)):
    row = platform.get_integration(user.organization_id, integration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    if not row["enabled"] or row["status"] == "disabled":
        raise HTTPException(status_code=409, detail="Integration is disabled")
    run = platform.enqueue_sync(user.organization_id, integration_id, user.user_id)
    record_audit_event(user.organization_id, user.user_id, "integration.sync.requested", "integration", str(integration_id), {"sync_run_id": str(run["id"])})
    return run


@router.get("/{integration_id}/sync-runs")
def sync_runs(integration_id: UUID, limit: int = Query(50, ge=1, le=200), user: AuthUser = Depends(require_security)):
    if not platform.get_integration(user.organization_id, integration_id):
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"sync_runs": platform.list_sync_runs(user.organization_id, integration_id, limit)}
