from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import HTTPException, status

from .config import settings

PASSWORD_ITERATIONS = 180_000
TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60


def hash_password(password: str) -> tuple[str, str]:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PASSWORD_ITERATIONS,
    ).hex()
    return salt, digest


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        PASSWORD_ITERATIONS,
    ).hex()
    return hmac.compare_digest(digest, expected_hash)


def _b64_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _sign(payload: str) -> str:
    digest = hmac.new(
        settings.admin_secret_key.encode("utf-8"),
        payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return _b64_encode(digest)


def create_admin_token(room_id: str) -> tuple[str, float]:
    expires_at = time.time() + TOKEN_TTL_SECONDS
    payload = {
        "room_id": room_id,
        "exp": expires_at,
        "nonce": secrets.token_urlsafe(12),
    }
    encoded_payload = _b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _sign(encoded_payload)
    return f"{encoded_payload}.{signature}", expires_at


def verify_admin_token(authorization: str | None, room_id: str) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Нужен токен админа")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload_part, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный токен") from exc

    expected_signature = _sign(payload_part)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный токен")

    try:
        payload = json.loads(_b64_decode(payload_part).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Некорректный токен") from exc

    if payload.get("room_id") != room_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Токен от другой комнаты")
    if float(payload.get("exp", 0)) < time.time():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен истек")
    return payload
