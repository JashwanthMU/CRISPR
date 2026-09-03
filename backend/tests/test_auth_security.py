"""Security regression tests for JWTs and protected risk-data APIs."""

import base64
import json
import os
from uuid import uuid4

os.environ.setdefault("AUTH_SECRET", "unit-test-signing-material-not-for-deployment")
os.environ.setdefault("SECURITY_ADMIN_PASSWORD", "unit-test-password")

from fastapi.testclient import TestClient

from backend.app.auth import AuthUser, create_token, require_security
from backend.app.main import app


SECURITY_USER = AuthUser(
    user_id=uuid4(),
    name="Test Security User",
    email="security-test@example.com",
    role="SECURITY",
)


def test_health_is_public() -> None:
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200


def test_findings_require_bearer_token() -> None:
    response = TestClient(app).get("/api/findings")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_all_sensitive_router_prefixes_require_authentication() -> None:
    client = TestClient(app)
    for path in (
        "/api/assets",
        "/api/risks",
        "/api/scenarios/presets",
        "/api/optimize/controls",
        "/api/compliance",
        "/api/assistant/forecast",
        "/api/ingestion/status",
        "/api/bug-bounty/reports",
    ):
        assert client.get(path).status_code == 401, path


def test_security_role_can_access_findings() -> None:
    import os
    # Skip if no DB available (runs correctly inside Docker)
    if not os.getenv("DATABASE_URL") and not os.getenv("DB_HOST"):
        import pytest
        pytest.skip("Requires database connection — passes in Docker CI")
    app.dependency_overrides[require_security] = lambda: SECURITY_USER
    try:
        response = TestClient(app).get("/api/findings")
        assert response.status_code == 200
        assert "findings" in response.json()
    finally:
        app.dependency_overrides.clear()


def test_token_is_standard_hs256_jwt() -> None:
    token = create_token(SECURITY_USER.model_dump(mode="json"))
    header_encoded, payload_encoded, _signature = token.split(".")
    header = json.loads(base64.urlsafe_b64decode(header_encoded + "=="))
    payload = json.loads(base64.urlsafe_b64decode(payload_encoded + "=="))
    assert header == {"alg": "HS256", "typ": "JWT"}
    assert payload["iss"] == "crispr-api"
    assert payload["aud"] == "crispr-web"
    assert payload["role"] == "SECURITY"
