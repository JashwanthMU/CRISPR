import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg import Error as PsycopgError

from backend.app.auth import ensure_default_security_user, require_security, validate_auth_configuration
from backend.app.api import (
    remediation,
    policies,
    reports,
    integrations,
    assistant,
    assets,
    auth,
    bug_bounty,
    compliance,
    findings,
    ingestion,
    optimization,
    risks,
    scenarios,
)
from backend.database.connection import init_database
from backend.ingestion.store import refresh_demo_sources

docs_enabled = os.getenv("API_DOCS_ENABLED", "false").lower() == "true"
app = FastAPI(
    title="CRISPR",
    version="1.0.0",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3000,http://localhost:3000"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

security_only = [Depends(require_security)]
app.include_router(findings.router,     prefix="/api/findings",    tags=["Findings"], dependencies=security_only)
app.include_router(assets.router,       prefix="/api/assets",      tags=["Assets"], dependencies=security_only)
app.include_router(risks.router,        prefix="/api/risks",       tags=["Risks"], dependencies=security_only)
app.include_router(scenarios.router,    prefix="/api/scenarios",   tags=["Scenarios"], dependencies=security_only)
app.include_router(optimization.router, prefix="/api/optimize",    tags=["Optimization"], dependencies=security_only)
app.include_router(compliance.router,   prefix="/api/compliance",  tags=["Compliance"], dependencies=security_only)
app.include_router(assistant.router,    prefix="/api/assistant",   tags=["AI"], dependencies=security_only)
app.include_router(auth.router,         prefix="/api/auth",        tags=["Authentication"])
app.include_router(ingestion.router,    prefix="/api/ingestion",   tags=["Ingestion"])
app.include_router(bug_bounty.router,   prefix="/api/bug-bounty",  tags=["Bug Bounty"])
app.include_router(remediation.router,  prefix="/api/remediation",   tags=["Remediation"],  dependencies=security_only)
app.include_router(policies.router,     prefix="/api/policies",      tags=["Policies"],     dependencies=security_only)
app.include_router(reports.router,      prefix="/api/reports",        tags=["Reports"],      dependencies=security_only)
app.include_router(integrations.router, prefix="/api/integrations",   tags=["Integrations"], dependencies=security_only)


@app.on_event("startup")
def startup() -> None:
    validate_auth_configuration()
    app.state.database_ready = False
    try:
        init_database()
        ensure_default_security_user()
        refresh_demo_sources()
        app.state.database_ready = True
    except PsycopgError:
        pass

@app.get("/api/health")
def health():
    db_status = "demo_json_fallback"
    if getattr(app.state, "database_ready", False):
        db_status = "connected"
    else:
        try:
            from backend.database.connection import get_connection
            with get_connection() as conn:
                conn.execute("SELECT 1")
            db_status = "connected"
            app.state.database_ready = True
        except Exception:
            pass
    return {"status": "ok", "service": "CRISPR", "database": db_status}
