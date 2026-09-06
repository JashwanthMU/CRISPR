"""Threat intelligence observations from the canonical ingestion store."""

from fastapi import APIRouter, Depends, HTTPException

from backend.app.auth import AuthUser, require_security
from backend.data_access import load_findings
from backend.app.models.responses import ThreatIntelCollectionResponse

router = APIRouter()


def _observations(organization_id) -> list[dict]:
    return load_findings("THREAT_INTEL", organization_id=organization_id)


@router.get("", response_model=ThreatIntelCollectionResponse)
def list_threat_intel(user: AuthUser = Depends(require_security)):
    rows = _observations(user.organization_id)
    return {"observations": rows, "count": len(rows),
            "source_count": len({row.get("source_name") for row in rows})}


@router.get("/{finding_id}")
def get_observation(finding_id: str, user: AuthUser = Depends(require_security)):
    row = next((item for item in _observations(user.organization_id) if item.get("finding_id") == finding_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Threat intelligence observation not found")
    return row
