"""Authentication helpers for reporter and security-team roles."""

import os
import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from psycopg import IntegrityError, OperationalError

from backend.database.connection import get_connection


TOKEN_SECRET = os.getenv("AUTH_SECRET", "change-this-secret-outside-local-development")
TOKEN_LIFETIME_HOURS = 12
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 600_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, rounds, salt, expected = encoded.split("$", 3)
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(rounds)
        )
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


class UserRole(str, Enum):
    REPORTER = "REPORTER"
    SECURITY = "SECURITY"


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthUser(BaseModel):
    user_id: UUID
    name: str
    email: EmailStr
    role: UserRole


def create_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = _b64(json.dumps({"sub": str(user["user_id"]), "role": user["role"], "iat": int(now.timestamp()), "exp": int((now + timedelta(hours=TOKEN_LIFETIME_HOURS)).timestamp())}, separators=(",", ":")).encode())
    signature = _b64(hmac.new(TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{signature}"


def authenticate_user(email: str, password: str) -> dict | None:
    with get_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE email = %s", (email.lower(),)
        ).fetchone()
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> AuthUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Valid authentication is required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise unauthorized
    try:
        encoded, signature = credentials.credentials.split(".", 1)
        expected = _b64(hmac.new(TOKEN_SECRET.encode(), encoded.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")
        payload = json.loads(_unb64(encoded))
        if int(payload["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("Expired token")
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as error:
        raise unauthorized from error
    try:
        with get_connection() as connection:
            user = connection.execute(
                "SELECT user_id, name, email, role FROM users WHERE user_id = %s",
                (user_id,),
            ).fetchone()
    except OperationalError as error:
        raise HTTPException(status_code=503, detail="PostgreSQL is unavailable") from error
    if not user:
        raise unauthorized
    return AuthUser.model_validate(user)


def require_security(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != UserRole.SECURITY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security-team access is required",
        )
    return user


def ensure_default_security_user() -> None:
    """Create the local demo security account once, without overwriting it."""
    from uuid import uuid4

    email = os.getenv("SECURITY_ADMIN_EMAIL", "security@novapay.com").lower()
    password = os.getenv("SECURITY_ADMIN_PASSWORD", "NovaPay-Security-2026")
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (user_id, name, email, password_hash, role)
            VALUES (%s, %s, %s, %s, 'SECURITY')
            ON CONFLICT (email) DO NOTHING
            """,
            (uuid4(), "NovaPay Security Team", email, hash_password(password)),
        )
