from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from jwt.exceptions import PyJWTError

from app.core.config import get_settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, settings.app_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.app_secret_key, algorithms=[ALGORITHM])
    except PyJWTError:
        return None


def encrypt_token(token: str) -> str:
    from cryptography.fernet import Fernet
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode()).encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    from cryptography.fernet import Fernet
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode()).decrypt(encrypted.encode()).decode()
