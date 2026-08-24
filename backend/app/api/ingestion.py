"""Live source-ingestion control and status APIs."""

from fastapi import APIRouter, Depends

from backend.app.auth import AuthUser, require_security
from backend.ingestion.store import ingestion_status, refresh_demo_sources


router = APIRouter()


@router.get("/status")
def get_ingestion_status(
    _: AuthUser = Depends(require_security),
) -> dict:
    sources = ingestion_status()
    return {"total_sources": len(sources), "sources": sources}


@router.post("/refresh")
def refresh_sources(
    _: AuthUser = Depends(require_security),
) -> dict:
    counts = refresh_demo_sources()
    return {
        "status": "completed",
        "records_processed": sum(counts.values()),
        "sources": counts,
    }
