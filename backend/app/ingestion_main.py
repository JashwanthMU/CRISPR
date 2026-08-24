"""Standalone FastAPI entry point for the ingestion and bug-bounty services."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import auth, bug_bounty, findings
from backend.app.auth import ensure_default_security_user
from backend.database.connection import init_database


app = FastAPI(title="CRISPR Ingestion API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(findings.router, prefix="/api/findings", tags=["Findings"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(
    bug_bounty.router, prefix="/api/bug-bounty", tags=["Bug Bounty"]
)


@app.on_event("startup")
def startup() -> None:
    init_database()
    ensure_default_security_user()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "CRISPR Ingestion API"}
