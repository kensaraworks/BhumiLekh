from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from api.app.models import UserRole

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class MagicLinkRequest(BaseModel):
    email: EmailStr

class VerifyLinkRequest(BaseModel):
    token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
