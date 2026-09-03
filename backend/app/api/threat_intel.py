"""Threat intelligence observations from the canonical ingestion store."""

from fastapi import APIRouter, HTTPException

from backend.data_access import load_findings

router = APIRouter()


def _observations() -> list[dict]:
    return load_findings("THREAT_INTEL")


@router.get("")
def list_threat_intel():
    rows = _observations()
    return {"observations": rows, "count": len(rows),
            "source_count": len({row.get("source_name") for row in rows})}


@router.get("/{finding_id}")
def get_observation(finding_id: str):
    row = next((item for item in _observations() if item.get("finding_id") == finding_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="Threat intelligence observation not found")
    return row
