from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from api.app.database import get_db
from api.app.routers.auth import router as auth_router
from api.app.routers.rbac import admin_router, user_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="BhumiLekh API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(user_router, prefix="/api")

@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        # Check DB connection
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        logging.error(f"Database health check failed: {e}")
        db_status = "error"
        
    return {
        "status": "ok",
        "db": db_status
    }
