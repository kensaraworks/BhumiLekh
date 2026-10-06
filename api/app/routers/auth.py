from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import JWTError, jwt
import logging

from api.app.database import get_db
from api.app.schemas import MagicLinkRequest, VerifyLinkRequest, TokenResponse, UserResponse
from api.app.models import User, UserRole
from api.app.auth import create_magic_link_token, create_access_token, get_current_user
from api.app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def _frontend_base(request: Request) -> str:
    """Pick the frontend origin for the magic link.

    Uses the browser's Origin header only if it's in FRONTEND_URL, so a forged
    Origin can't make us mint links pointing at someone else's site.
    """
    allowed = settings.frontend_url_list
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin and origin in allowed:
        return origin
    return allowed[0] if allowed else "http://localhost:5173"

@router.post("/request-magic-link")
async def request_magic_link(req: MagicLinkRequest, request: Request, db: AsyncSession = Depends(get_db)):
    email = req.email.lower()
    
    # Check if email is in allowlist
    allowed_emails = settings.allowed_email_list
    if email not in allowed_emails:
        # Prevent user enumeration by returning a success message anyway
        logger.warning(f"Unauthorized email attempted login: {email}")
        return {"message": "If the email is allowed, a magic link has been sent."}

    # Generate magic link
    token = create_magic_link_token(email)
    
    # In development, print to console
    link = f"{_frontend_base(request)}/login/verify?token={token}"
    logger.info(f"MAGIC LINK FOR {email}: {link}")
    
    # In a real app, send an email here

    response = {"message": "If the email is allowed, a magic link has been sent."}
    # Development only: hand the link back so the login page can show it.
    # Never enable this outside development - anyone who knows an allowed email could sign in.
    if settings.app_env == "development":
        response["dev_link"] = link
    return response

@router.post("/verify", response_model=TokenResponse)
async def verify_magic_link(req: VerifyLinkRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(req.token, settings.secret_key, algorithms=["HS256"])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "magic":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
    # Check if user exists, else create
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if not user:
        # Make the first user an admin if they are admin@example.com, otherwise just user
        role = UserRole.ADMIN if "admin" in email else UserRole.USER
        user = User(email=email, role=role)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is inactive")
        
    access_token = create_access_token(user.email)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
