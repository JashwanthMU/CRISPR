from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg import Error as PsycopgError

from backend.app.auth import ensure_default_security_user
from backend.app.api import (
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

app = FastAPI(title="CRISPR", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(findings.router,     prefix="/api/findings",    tags=["Findings"])
app.include_router(assets.router,       prefix="/api/assets",      tags=["Assets"])
app.include_router(risks.router,        prefix="/api/risks",       tags=["Risks"])
app.include_router(scenarios.router,    prefix="/api/scenarios",   tags=["Scenarios"])
app.include_router(optimization.router, prefix="/api/optimize",    tags=["Optimization"])
app.include_router(compliance.router,   prefix="/api/compliance",  tags=["Compliance"])
app.include_router(assistant.router,    prefix="/api/assistant",   tags=["AI"])
app.include_router(auth.router,         prefix="/api/auth",        tags=["Authentication"])
app.include_router(ingestion.router,    prefix="/api/ingestion",   tags=["Ingestion"])
app.include_router(bug_bounty.router,   prefix="/api/bug-bounty",  tags=["Bug Bounty"])


@app.on_event("startup")
def startup() -> None:
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
    return {
        "status": "ok",
        "service": "CRISPR",
        "database": "connected" if getattr(app.state, "database_ready", False) else "demo_json_fallback",
    }
