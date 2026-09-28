from fastapi import APIRouter, Depends
from api.app.models import User
from api.app.auth import get_current_admin, get_current_user

admin_router = APIRouter(prefix="/admin", tags=["admin"])
user_router = APIRouter(prefix="/user", tags=["user"])

@admin_router.get("/test")
async def admin_test(current_admin: User = Depends(get_current_admin)):
    return {"message": "Admin authorization works!", "email": current_admin.email}

@user_router.get("/test")
async def user_test(current_user: User = Depends(get_current_user)):
    return {"message": "User authorization works!", "email": current_user.email}
