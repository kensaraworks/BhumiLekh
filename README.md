# BhumiLekh

BhumiLekh is a land intelligence application platform. This repository contains the application foundation.

## Current PR Scope
This initial PR establishes the application foundation, including:
- PostgreSQL 16 + PostGIS infrastructure via Docker
- Database migrations with Alembic
- FastAPI backend foundation
- React + Vite + TypeScript frontend foundation
- Email magic-link authentication
- Role-Based Access Control (RBAC) implementation

**Note:** Land-data ingestion, parsing logic, scrapers, and map rendering are not yet implemented. These components belong to the data pipeline and will be added in a subsequent PR. Placeholder screens exist in the UI for routing purposes.

## Repository Structure

```
/
├── .github/          # CI/CD Workflows
├── api/              # FastAPI backend
├── db/               # Database migrations and seeds
├── ingest/           # Future land data ingest pipelines
├── ops/              # Future operations and deployment configs
├── web/              # React frontend
├── docker-compose.yml# Local database setup
└── alembic.ini       # Migrations configuration
```

## Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

## Local Development Setup

### 1. Database Setup
Start the local PostgreSQL / PostGIS database:
```sh
docker compose up -d
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```sh
cp .env.example .env
```
Ensure you have the test emails configured in `ALLOWED_EMAILS`.

### 3. Run Migrations
Set up your Python virtual environment and run migrations to build the schema:
```sh
# On Windows
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r api/requirements.txt
alembic upgrade head

# On Unix
python -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt
alembic upgrade head
```

### 4. Start the Backend
Start the FastAPI application:
```sh
# Ensure your virtual environment is activated
uvicorn api.app.main:app --reload
```
The backend will run at `http://localhost:8000`.
Health endpoint: `http://localhost:8000/api/health`

### 5. Start the Frontend
In a new terminal window, start the React application:
```sh
cd web
npm install
npm run dev
```
The frontend will run at `http://localhost:5173`.

## Authentication and RBAC
- **Login:** Users can sign in via `/login` by entering their email address.
- **Magic Link:** The backend checks if the email is allowed in `.env` (`ALLOWED_EMAILS`). If allowed, a magic link is generated. In development mode, the backend prints this link to the console.
- **Verification:** Users click the link, and the system issues an access token and stores it securely.
- **RBAC:** The API verifies user roles (`USER` vs `ADMIN`). For example, normal users cannot access admin endpoints (`/api/admin/test`). If a user signs in as `admin@example.com`, they are granted the `ADMIN` role.

## Testing
Run backend tests using Pytest:
```sh
# Make sure aiosqlite is installed in your test environment if using memory sqlite
pip install aiosqlite
cd api
pytest tests/
```

## Continuous Integration (CI)
GitHub Actions automatically runs on push and pull requests to `main`. It:
- Validates the Python backend (linting, tests, migrations)
- Validates the React frontend (dependency installation, TypeScript build)
