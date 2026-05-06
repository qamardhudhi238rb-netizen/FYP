from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt  # Native bcrypt is more reliable with Python 3.12
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from database import get_settings, get_db

# We are removing Passlib's CryptContext to avoid the "72-byte" and "__about__" errors
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a hashed version.
    Bcrypt requires bytes, so we encode the strings first.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def hash_password(password: str) -> str:
    """
    Hashes a password using a freshly generated salt.
    Returns the hash as a UTF-8 string for database storage.
    """
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    payload = data.copy()
    
    # Updated to use timezone-aware UTC to avoid DeprecationWarnings in Python 3.12+
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
):
    settings = get_settings()
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        email: str = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc

    # Assuming 'db' is a Motor/MongoDB client based on the .find_one syntax
    user = await db.users.find_one({"email": email})
    if not user:
        raise exc
        
    return user