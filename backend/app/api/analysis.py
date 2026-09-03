from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg.types.json import Jsonb

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.services.audit import record_audit_event
from backend.services.risk_pipeline import latest_snapshot, list_snapshots

router = APIRouter()


@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
def run_analysis(user: AuthUser = Depends(require_security)):
    job_id = uuid4()
    with get_connection() as db:
        row = db.execute(
            """INSERT INTO jobs(job_id,organization_id,job_type,payload)
               VALUES (%s,%s,'risk.analysis',%s) RETURNING job_id AS id,status,created_at""",
            (job_id, user.organization_id, Jsonb({"requested_by": str(user.user_id)})),
        ).fetchone()
    record_audit_event(user.organization_id, user.user_id, "analysis.requested", "job", str(job_id))
    return {**row, "started": True}


@router.get("/jobs/{job_id}")
def job_status(job_id: str, user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        row = db.execute(
            """SELECT job_id AS id,status,result,error,attempts,created_at,started_at,completed_at
               FROM jobs WHERE organization_id=%s AND job_id=%s AND job_type='risk.analysis'""",
            (user.organization_id, job_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return row


@router.get("/snapshots/latest")
def current_snapshot(user: AuthUser = Depends(require_security)):
    row = latest_snapshot(user.organization_id)
    if not row:
        raise HTTPException(status_code=404, detail="No completed risk snapshot exists")
    return row


@router.get("/snapshots")
def snapshot_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: AuthUser = Depends(require_security),
):
    rows = list_snapshots(user.organization_id, limit, offset)
    return {"snapshots": rows, "limit": limit, "offset": offset}
