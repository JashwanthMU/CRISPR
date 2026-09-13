"""Authenticated encryption for integration credentials."""

import json
import os

from cryptography.fernet import Fernet, InvalidToken


def _fernet() -> Fernet:
    key = os.getenv("INTEGRATION_ENCRYPTION_KEY", "").encode()
    if not key:
        raise RuntimeError("INTEGRATION_ENCRYPTION_KEY is required to store connector credentials")
    try:
        return Fernet(key)
    except ValueError as error:
        raise RuntimeError("INTEGRATION_ENCRYPTION_KEY must be a valid Fernet key") from error


def encrypt_credentials(value: dict) -> bytes:
    return _fernet().encrypt(json.dumps(value, separators=(",", ":")).encode())


def decrypt_credentials(value: bytes) -> dict:
    try:
        return json.loads(_fernet().decrypt(bytes(value)))
    except (InvalidToken, json.JSONDecodeError) as error:
        raise RuntimeError("Stored connector credentials cannot be decrypted") from error
