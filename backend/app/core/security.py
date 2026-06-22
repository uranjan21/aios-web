import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from jwt.exceptions import ExpiredSignatureError, PyJWTError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

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
    except ExpiredSignatureError:
        logger.debug("JWT token expired")
        return None
    except PyJWTError as exc:
        logger.warning("JWT decode failed: %s", exc)
        return None


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000)
    return f"{salt}${hashed.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, hashed = password_hash.split("$", 1)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 600_000)
        return secrets.compare_digest(expected.hex(), hashed)
    except (ValueError, AttributeError):
        return False


def encrypt_token(token: str) -> str:
    from cryptography.fernet import Fernet
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode()).encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    from cryptography.fernet import Fernet
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode()).decrypt(encrypted.encode()).decode()
