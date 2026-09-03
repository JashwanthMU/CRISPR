import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

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
    threat_intel,
    attack_paths,
    settings,
    projects,
    repositories,
    sca,
    audit,
    analysis,
    model_governance,
)
from backend.database.connection import database_ready, schema_revision
from backend.ingestion.store import refresh_demo_sources
from backend.data_access import LiveDataUnavailable, demo_mode_enabled

docs_enabled = os.getenv("API_DOCS_ENABLED", "false").lower() == "true"


@asynccontextmanager
async def lifespan(application: FastAPI):
    validate_auth_configuration()
    ready, reason = database_ready()
    if not ready:
        raise RuntimeError(f"Database is not ready: {reason}. Run 'alembic upgrade head'.")
    ensure_default_security_user()
    if demo_mode_enabled() and os.getenv("DEMO_AUTO_SEED", "false").lower() == "true":
        refresh_demo_sources()
    application.state.database_ready = True
    yield


app = FastAPI(
    title="CRISPR",
    version="1.0.0",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
    lifespan=lifespan,
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


@app.exception_handler(LiveDataUnavailable)
def live_data_unavailable(_: Request, error: LiveDataUnavailable) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "detail": str(error),
            "data_mode": "live",
            "fallback_used": False,
        },
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
app.include_router(threat_intel.router, prefix="/api/threat-intel",   tags=["Threat Intel"], dependencies=security_only)
app.include_router(attack_paths.router, prefix="/api/attack-paths",   tags=["Attack Paths"], dependencies=security_only)
app.include_router(settings.router,     prefix="/api/settings",       tags=["Settings"], dependencies=security_only)
app.include_router(projects.router,     prefix="/api/projects",       tags=["Projects"], dependencies=security_only)
app.include_router(repositories.router, prefix="/api/repositories",   tags=["Repositories"], dependencies=security_only)
app.include_router(sca.router,          prefix="/api/sca",            tags=["SCA"], dependencies=security_only)
app.include_router(audit.router,        prefix="/api/audit-events",   tags=["Audit"], dependencies=security_only)
app.include_router(analysis.router,     prefix="/api/analysis",       tags=["Analysis"], dependencies=security_only)
app.include_router(model_governance.router, prefix="/api/model-governance", tags=["Model Governance"], dependencies=security_only)

# Versioned aliases allow clients to migrate without breaking the existing UI.
for api_router, path, tag, dependencies in (
    (findings.router, "/findings", "Findings", security_only),
    (assets.router, "/assets", "Assets", security_only),
    (risks.router, "/risks", "Risks", security_only),
    (scenarios.router, "/scenarios", "Scenarios", security_only),
    (optimization.router, "/optimize", "Optimization", security_only),
    (compliance.router, "/compliance", "Compliance", security_only),
    (assistant.router, "/assistant", "AI", security_only),
    (auth.router, "/auth", "Authentication", []),
    (ingestion.router, "/ingestion", "Ingestion", []),
    (bug_bounty.router, "/bug-bounty", "Bug Bounty", []),
    (remediation.router, "/remediation", "Remediation", security_only),
    (policies.router, "/policies", "Policies", security_only),
    (reports.router, "/reports", "Reports", security_only),
    (integrations.router, "/integrations", "Integrations", security_only),
    (threat_intel.router, "/threat-intel", "Threat Intel", security_only),
    (attack_paths.router, "/attack-paths", "Attack Paths", security_only),
    (settings.router, "/settings", "Settings", security_only),
    (projects.router, "/projects", "Projects", security_only),
    (repositories.router, "/repositories", "Repositories", security_only),
    (sca.router, "/sca", "SCA", security_only),
    (audit.router, "/audit-events", "Audit", security_only),
    (analysis.router, "/analysis", "Analysis", security_only),
    (model_governance.router, "/model-governance", "Model Governance", security_only),
):
    app.include_router(
        api_router, prefix=f"/api/v1{path}", tags=[f"v1 {tag}"], dependencies=dependencies
    )


@app.get("/api/health/live")
@app.get("/api/v1/health/live")
def health_live():
    return {"status": "ok", "service": "CRISPR"}


@app.get("/api/health/ready")
@app.get("/api/v1/health/ready")
def health_ready():
    ready, reason = database_ready()
    content = {
        "status": "ready" if ready else "not_ready",
        "service": "CRISPR",
        "database": "connected" if ready else "unavailable",
        "schema_revision": schema_revision() if ready else None,
        "reason": reason,
        "data_mode": "demo" if demo_mode_enabled() else "live",
        "fixture_fallback_enabled": demo_mode_enabled(),
    }
    return JSONResponse(status_code=200 if ready else 503, content=content)


@app.get("/api/health")
def health():
    ready, reason = database_ready()
    return {
        "status": "ok" if ready else "not_ready",
        "service": "CRISPR",
        "database": "connected" if ready else "unavailable",
        "schema_revision": schema_revision() if ready else None,
        "reason": reason,
        "data_mode": "demo" if demo_mode_enabled() else "live",
        "fixture_fallback_enabled": demo_mode_enabled(),
    }
