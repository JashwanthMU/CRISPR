"""Registration, rate-limited login, refresh, logout, and current user."""

import hashlib
import ipaddress
import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from psycopg import IntegrityError, OperationalError

from backend.app.auth import (
    AuthUser, DEFAULT_ORGANIZATION_ID, LoginRequest, RegisterRequest,
    TOKEN_LIFETIME_MINUTES, authenticate_user, create_token, get_current_user, hash_password,
)
from backend.database.connection import get_connection
from backend.services.audit import record_audit_event

router = APIRouter()
MAX_LOGIN_FAILURES = 5
LOGIN_WINDOW_MINUTES = 15
REFRESH_TOKEN_DAYS = 14


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _client_ip(request: Request) -> str | None:
    candidate = request.client.host if request.client else None
    try:
        return str(ipaddress.ip_address(candidate)) if candidate else None
    except ValueError:
        return None


def auth_response(user: dict) -> dict:
    refresh_token = secrets.token_urlsafe(48)
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO auth_sessions (
                session_id, organization_id, user_id, refresh_token_hash, expires_at
            ) VALUES (%s,%s,%s,%s,%s)
            """,
            (
                uuid4(), user.get("organization_id", DEFAULT_ORGANIZATION_ID),
                user["user_id"], _hash_token(refresh_token),
                datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
            ),
        )
    return {
        "access_token": create_token(user), "refresh_token": refresh_token,
        "token_type": "bearer", "expires_in_seconds": TOKEN_LIFETIME_MINUTES * 60,
        "user": AuthUser.model_validate(user),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> dict:
    if os.getenv("ALLOW_PUBLIC_REPORTER_REGISTRATION", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Public reporter registration is disabled")
    user_id = uuid4()
    try:
        with get_connection() as connection:
            user = connection.execute(
                """
                INSERT INTO users (user_id,name,email,password_hash,role,organization_id)
                VALUES (%s,%s,%s,%s,'REPORTER',%s)
                RETURNING user_id,name,email,role,organization_id
                """,
                (
                    user_id, payload.name.strip(), str(payload.email).lower(),
                    hash_password(payload.password), DEFAULT_ORGANIZATION_ID,
                ),
            ).fetchone()
            connection.execute(
                """INSERT INTO organization_members(organization_id,user_id,role)
                   VALUES (%s,%s,'REPORTER') ON CONFLICT DO NOTHING""",
                (DEFAULT_ORGANIZATION_ID, user_id),
            )
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="An account with this email exists") from error
    except OperationalError as error:
        raise HTTPException(status_code=503, detail="PostgreSQL is unavailable") from error
    record_audit_event(user["organization_id"], user_id, "auth.register", "user", str(user_id))
    return auth_response(user)


@router.post("/login")
def login(payload: LoginRequest, request: Request) -> dict:
    email = str(payload.email).lower()
    ip_address = _client_ip(request)
    try:
        with get_connection() as connection:
            failures = connection.execute(
                """
                SELECT COUNT(*) AS count FROM login_attempts
                WHERE email=%s AND succeeded=FALSE
                  AND created_at > NOW() - INTERVAL '15 minutes'
                  AND created_at > COALESCE((SELECT MAX(created_at) FROM login_attempts
                                             WHERE email=%s AND succeeded=TRUE), '-infinity')
                """,
                (email, email),
            ).fetchone()["count"]
        if failures >= MAX_LOGIN_FAILURES:
            raise HTTPException(status_code=429, detail="Too many failed login attempts; retry later")
        user = authenticate_user(email, payload.password)
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO login_attempts(attempt_id,email,ip_address,succeeded) VALUES (%s,%s,%s,%s)",
                (uuid4(), email, ip_address, bool(user)),
            )
    except HTTPException:
        raise
    except OperationalError as error:
        raise HTTPException(status_code=503, detail="PostgreSQL is unavailable") from error
    if not user:
        record_audit_event(None, None, "auth.login_failed", "user", email, ip_address=ip_address)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    record_audit_event(
        user["organization_id"], user["user_id"], "auth.login", "user",
        str(user["user_id"]), ip_address=ip_address,
    )
    return auth_response(user)


@router.post("/refresh")
def refresh(body: RefreshRequest) -> dict:
    token_hash = _hash_token(body.refresh_token)
    with get_connection() as connection:
        session = connection.execute(
            """
            SELECT s.session_id,u.user_id,u.name,u.email,u.role,u.organization_id
            FROM auth_sessions s JOIN users u ON u.user_id=s.user_id
            WHERE s.refresh_token_hash=%s AND s.revoked_at IS NULL AND s.expires_at>NOW()
            FOR UPDATE
            """,
            (token_hash,),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=401, detail="Refresh token is invalid or expired")
        connection.execute(
            "UPDATE auth_sessions SET revoked_at=NOW() WHERE session_id=%s",
            (session["session_id"],),
        )
    return auth_response(session)


@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, user: AuthUser = Depends(get_current_user)) -> None:
    with get_connection() as connection:
        connection.execute(
            """UPDATE auth_sessions SET revoked_at=NOW()
               WHERE refresh_token_hash=%s AND user_id=%s AND revoked_at IS NULL""",
            (_hash_token(body.refresh_token), user.user_id),
        )
    record_audit_event(user.organization_id, user.user_id, "auth.logout", "user", str(user.user_id))


@router.get("/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    return user
