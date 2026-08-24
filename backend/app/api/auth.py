"""Registration, login, and current-user endpoints."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import IntegrityError, OperationalError

from backend.app.auth import (
    AuthUser,
    LoginRequest,
    RegisterRequest,
    authenticate_user,
    create_token,
    get_current_user,
    hash_password,
)
from backend.database.connection import get_connection


router = APIRouter()


def auth_response(user: dict) -> dict:
    return {
        "access_token": create_token(user),
        "token_type": "bearer",
        "user": AuthUser.model_validate(user),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> dict:
    user_id = uuid4()
    try:
        with get_connection() as connection:
            user = connection.execute(
                """
                INSERT INTO users (user_id, name, email, password_hash, role)
                VALUES (%s, %s, %s, %s, 'REPORTER')
                RETURNING user_id, name, email, role
                """,
                (
                    user_id,
                    payload.name.strip(),
                    str(payload.email).lower(),
                    hash_password(payload.password),
                ),
            ).fetchone()
    except IntegrityError as error:
        raise HTTPException(status_code=409, detail="An account with this email exists") from error
    except OperationalError as error:
        raise HTTPException(status_code=503, detail="PostgreSQL is unavailable") from error
    return auth_response(user)


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    try:
        user = authenticate_user(str(payload.email), payload.password)
    except OperationalError as error:
        raise HTTPException(status_code=503, detail="PostgreSQL is unavailable") from error
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return auth_response(user)


@router.get("/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    return user
