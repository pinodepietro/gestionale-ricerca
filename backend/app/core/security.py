# backend/app/core/security.py
from datetime import datetime, timedelta
from typing import Any
from jose import jwt, JWTError
import bcrypt
from fastapi import HTTPException, status
from app.core.config import settings

ALGORITHM = "HS256"


def crea_access_token(data: dict[str, Any]) -> str:
    payload = data.copy()
    scadenza = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload.update({"exp": scadenza})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def verifica_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "AUTH_TOKEN_EXPIRED", "message": "Token non valido o scaduto"}},
        )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verifica_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())
