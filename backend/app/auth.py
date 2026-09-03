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


TOKEN_SECRET = os.getenv("AUTH_SECRET", "")
TOKEN_ISSUER = "crispr-api"
TOKEN_AUDIENCE = "crispr-web"
TOKEN_LIFETIME_MINUTES = int(os.getenv("ACCESS_TOKEN_LIFETIME_MINUTES", "30"))
DEFAULT_ORGANIZATION_ID = UUID("00000000-0000-0000-0000-000000000001")
bearer = HTTPBearer(auto_error=False)


def validate_auth_configuration() -> None:
    """Fail closed when the signing key is missing or trivially weak."""
    if len(TOKEN_SECRET) < 32:
        raise RuntimeError(
            "AUTH_SECRET must be set to at least 32 characters "
            "(generate one with: openssl rand -hex 32)"
        )


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
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthUser(BaseModel):
    user_id: UUID
    name: str
    email: EmailStr
    role: UserRole
    organization_id: UUID = DEFAULT_ORGANIZATION_ID


def create_token(user: dict) -> str:
    validate_auth_configuration()
    now = datetime.now(timezone.utc)
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({
        "sub": str(user["user_id"]),
        "role": user["role"],
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=TOKEN_LIFETIME_MINUTES)).timestamp()),
        "organization_id": str(user.get("organization_id", DEFAULT_ORGANIZATION_ID)),
    }, separators=(",", ":")).encode())
    signing_input = f"{header}.{payload}"
    signature = _b64(hmac.new(TOKEN_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest())
    return f"{signing_input}.{signature}"


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
        validate_auth_configuration()
        header_encoded, payload_encoded, signature = credentials.credentials.split(".")
        header = json.loads(_unb64(header_encoded))
        if header != {"alg": "HS256", "typ": "JWT"}:
            raise ValueError("Unsupported JWT header")
        signing_input = f"{header_encoded}.{payload_encoded}"
        expected = _b64(hmac.new(TOKEN_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")
        payload = json.loads(_unb64(payload_encoded))
        now = int(datetime.now(timezone.utc).timestamp())
        if payload.get("iss") != TOKEN_ISSUER or payload.get("aud") != TOKEN_AUDIENCE:
            raise ValueError("Invalid token issuer or audience")
        if int(payload["exp"]) < now or int(payload["nbf"]) > now:
            raise ValueError("Expired token")
        user_id = UUID(payload["sub"])
        token_organization_id = UUID(payload["organization_id"])
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as error:
        raise unauthorized from error
    try:
        with get_connection() as connection:
            user = connection.execute(
                "SELECT user_id, name, email, role, organization_id FROM users WHERE user_id = %s",
                (user_id,),
            ).fetchone()
    except OperationalError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PostgreSQL is unavailable; token ownership could not be verified",
        ) from error
    if not user:
        raise unauthorized
    if user["organization_id"] != token_organization_id:
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
    """Create the configured security administrator once without rotating its password."""
    from uuid import uuid4

    email = os.getenv("SECURITY_ADMIN_EMAIL", "").strip().lower()
    if not email:
        raise RuntimeError("SECURITY_ADMIN_EMAIL must be set")
    password = os.getenv("SECURITY_ADMIN_PASSWORD", "")
    if len(password) < 12:
        raise RuntimeError("SECURITY_ADMIN_PASSWORD must be at least 12 characters")
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT user_id FROM users WHERE email=%s", (email,)
        ).fetchone()
        if existing:
            connection.execute(
                """INSERT INTO organization_members(organization_id,user_id,role)
                   VALUES (%s,%s,'SECURITY') ON CONFLICT DO NOTHING""",
                (DEFAULT_ORGANIZATION_ID, existing["user_id"]),
            )
            return
        user = connection.execute(
            """
            INSERT INTO users (user_id, name, email, password_hash, role, organization_id)
            VALUES (%s, %s, %s, %s, 'SECURITY', %s)
            ON CONFLICT (email) DO NOTHING
            """,
            (uuid4(), "NovaPay Security Team", email, hash_password(password), DEFAULT_ORGANIZATION_ID),
        )
        row = connection.execute("SELECT user_id FROM users WHERE email=%s", (email,)).fetchone()
        connection.execute(
            """INSERT INTO organization_members(organization_id,user_id,role)
               VALUES (%s,%s,'SECURITY') ON CONFLICT DO NOTHING""",
            (DEFAULT_ORGANIZATION_ID, row["user_id"]),
        )
