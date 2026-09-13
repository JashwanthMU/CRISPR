"""Durable external integration configuration and synchronization API."""

from datetime import datetime, timezone
from typing import Literal, Union
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, SecretStr

from backend.app.auth import AuthUser, require_security
from backend.connectors.github import GitHubConnector
from backend.connectors.generic_http import GenericHTTPConnector
from backend.repositories import platform
from backend.security.secrets import decrypt_credentials, encrypt_credentials
from backend.services.audit import record_audit_event

router = APIRouter()


class GitHubIntegrationCreate(BaseModel):
    provider: Literal["github"] = "github"
    name: str = Field(min_length=2, max_length=160)
    token: SecretStr
    webhook_secret: SecretStr | None = None
    organization: str | None = Field(default=None, max_length=120)
    sync_interval_minutes: int = Field(default=60, ge=5, le=10080)


class GenericHTTPIntegrationCreate(BaseModel):
    provider: Literal["generic_http"] = "generic_http"
    name: str = Field(min_length=2, max_length=160)
    base_url: str = Field(min_length=8, max_length=1000)
    token: SecretStr | None = None
    health_path: str = Field(min_length=1, max_length=500)
    events_path: str = Field(min_length=1, max_length=500)
    assets_path: str | None = Field(default=None, max_length=500)
    items_field: str = Field(default="items", min_length=1, max_length=120)
    next_cursor_field: str = Field(default="next_cursor", min_length=1, max_length=120)
    cursor_parameter: str = Field(default="cursor", min_length=1, max_length=120)
    cursor_strategy: Literal["observed_at", "opaque"] = "observed_at"
    max_pages_per_sync: int = Field(default=100, ge=1, le=10000)
    external_id_field: str = Field(default="id", min_length=1, max_length=120)
    event_type_field: str = Field(default="event_type", min_length=1, max_length=120)
    observed_at_field: str = Field(default="observed_at", min_length=1, max_length=120)
    asset_id_field: str = Field(default="asset_id", min_length=1, max_length=120)
    severity_field: str = Field(default="severity", min_length=1, max_length=120)
    auth_header: str = Field(default="Authorization", min_length=1, max_length=120)
    auth_prefix: str = Field(default="Bearer", max_length=40)
    sync_interval_minutes: int = Field(default=60, ge=5, le=10080)


def _public(row: dict) -> dict:
    result = dict(row)
    result.pop("encrypted_credentials", None)
    result["items_ingested"] = int(result.get("config", {}).get("items_ingested", 0))
    return result


@router.get("")
def integrations(user: AuthUser = Depends(require_security)):
    items = [_public(row) for row in platform.list_integrations(user.organization_id)]
    connected = sum(item["status"] == "connected" for item in items)
    return {"integrations": items, "count": len(items), "connected_count": connected,
            "disconnected_count": len(items) - connected}


@router.post("", status_code=status.HTTP_201_CREATED)
def configure(body: Union[GitHubIntegrationCreate, GenericHTTPIntegrationCreate], user: AuthUser = Depends(require_security)):
    if body.provider == "github":
        token = body.token.get_secret_value()
        connector = GitHubConnector(token, body.organization)
        config = {"organization": body.organization, "sync_interval_minutes": body.sync_interval_minutes}
    else:
        token = body.token.get_secret_value() if body.token else ""
        config = body.model_dump(exclude={"provider", "name", "token", "webhook_secret"})
        connector = GenericHTTPConnector(config, {"token": token})
    try:
        verification = connector.validate_credentials()
    except RuntimeError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    config["verified_account"] = verification.account
    try:
        credentials = {"token": token} if token else {}
        if body.provider == "generic_http" and body.webhook_secret:
            credentials["webhook_secret"] = body.webhook_secret.get_secret_value()
        row = platform.create_integration(
            user.organization_id, body.provider, body.name, config, encrypt_credentials(credentials)
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
    if row["provider"] not in {"github", "generic_http"}:
        raise HTTPException(status_code=501, detail=f"Provider {row['provider']} is not implemented")
    credentials = decrypt_credentials(row["encrypted_credentials"])
    try:
        connector = (GitHubConnector(credentials["token"], row["config"].get("organization"))
                     if row["provider"] == "github" else GenericHTTPConnector(row["config"], credentials))
        result = connector.healthcheck()
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
