from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from fastapi import status, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session
from typing import Optional, Union
from uuid import UUID
from database import get_db
from models import User, UserRole, Admin, ServiceProvider, HomeOwner

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="signin")

SECRET_KEY = "mysecret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days in minutes
ADMIN_TOKEN_EXPIRE_MINUTES = 8 * 60  # 8 hours for admins
SUPER_ADMIN_TOKEN_EXPIRE_MINUTES = 24 * 60  # 24 hours for super admins

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    
    # Convert UUIDs to strings
    for key, value in to_encode.items():
        if isinstance(value, UUID):
            to_encode[key] = str(value)
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_admin_token(email: str, user_id: UUID, is_super_admin: bool):
    if is_super_admin:
        expires_delta = timedelta(minutes=SUPER_ADMIN_TOKEN_EXPIRE_MINUTES)
    else:
        expires_delta = timedelta(minutes=ADMIN_TOKEN_EXPIRE_MINUTES)
    
    return create_access_token(
        data={
            "sub": email,
            "user_id": user_id,
            "role": UserRole.ADMIN.value,
            "is_super_admin": is_super_admin
        },
        expires_delta=expires_delta
    )

async def get_current_admin_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        # Check token expiration
        expire = payload.get("exp")
        if expire is None or datetime.utcnow() > datetime.fromtimestamp(expire):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        
        # Verify admin role
        role: str = payload.get("role")
        if role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None or user.role != UserRole.ADMIN.value:
        raise credentials_exception
    
    return user

async def get_current_super_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    try:
        # First get the current admin user
        user = await get_current_admin_user(token, db)
        
        # Then verify super admin status from token first
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_is_super = payload.get("is_super_admin", False)
        
        if not token_is_super:
            # Fallback to database check if token doesn't have the claim
            admin = db.query(Admin).filter(Admin.user_id == user.id).first()
            if not admin or not admin.is_super_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Super admin privileges required"
                )
        return user
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Super admin validation failed: {str(e)}"
        )

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        if token.startswith('Bearer '):
            token = token[7:]
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check token expiration
        expire = payload.get("exp")
        if expire is None or datetime.utcnow() > datetime.fromtimestamp(expire):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
            
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
        
    return user

async def get_current_user_for_messaging(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    return await get_current_user(token, db)
