import pytest
from httpx import AsyncClient
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from api.app.main import app
from api.app.database import Base, get_db
from api.app.auth import create_access_token

# Use a memory sqlite for testing
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True)
async def prepare_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_unauthenticated_request(async_client):
    response = await async_client.get("/api/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_request_magic_link(async_client):
    response = await async_client.post("/api/auth/request-magic-link", json={"email": "user@example.com"})
    assert response.status_code == 200
    assert "magic link has been sent" in response.json()["message"]

@pytest.mark.asyncio
async def test_magic_link_returned_in_development(async_client, monkeypatch):
    from api.app.config import settings
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "allowed_emails", "user@example.com")
    response = await async_client.post("/api/auth/request-magic-link", json={"email": "user@example.com"})
    assert response.status_code == 200
    assert "/login/verify?token=" in response.json()["dev_link"]

@pytest.mark.asyncio
async def test_magic_link_hidden_outside_development(async_client, monkeypatch):
    from api.app.config import settings
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "allowed_emails", "user@example.com")
    response = await async_client.post("/api/auth/request-magic-link", json={"email": "user@example.com"})
    assert response.status_code == 200
    assert "dev_link" not in response.json()

@pytest.mark.asyncio
async def test_authenticated_user_access(async_client):
    # Need to create the user in the db first through the auth flow or mock
    # Wait, the easiest is just generating a token since the dependency decodes it
    token = create_access_token("user@example.com")
    
    # But wait, user must exist in DB for get_current_user to succeed
    async with TestingSessionLocal() as session:
        from api.app.models import User, UserRole
        user = User(email="user@example.com", role=UserRole.USER)
        session.add(user)
        await session.commit()
    
    response = await async_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"
    
    # Test user accessing admin endpoint
    response = await async_client.get("/api/admin/test", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_admin_user_access(async_client):
    token = create_access_token("admin@example.com")
    
    async with TestingSessionLocal() as session:
        from api.app.models import User, UserRole
        admin = User(email="admin@example.com", role=UserRole.ADMIN)
        session.add(admin)
        await session.commit()
    
    response = await async_client.get("/api/admin/test", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["message"] == "Admin authorization works!"
