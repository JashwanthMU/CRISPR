from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import findings, assets, risks, scenarios, optimization, compliance, assistant

app = FastAPI(title="CRISPR", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(findings.router,     prefix="/api/findings",    tags=["Findings"])
app.include_router(assets.router,       prefix="/api/assets",      tags=["Assets"])
app.include_router(risks.router,        prefix="/api/risks",       tags=["Risks"])
app.include_router(scenarios.router,    prefix="/api/scenarios",   tags=["Scenarios"])
app.include_router(optimization.router, prefix="/api/optimize",    tags=["Optimization"])
app.include_router(compliance.router,   prefix="/api/compliance",  tags=["Compliance"])
app.include_router(assistant.router,    prefix="/api/assistant",   tags=["AI"])

@app.get("/api/health")
def health(): return {"status": "ok", "service": "CRISPR"}