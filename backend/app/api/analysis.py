from uuid import uuid4

from fastapi import APIRouter, Depends, status
from psycopg.types.json import Jsonb

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.services.audit import record_audit_event

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


@router.get("/{job_id}")
def job_status(job_id: str, user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        row = db.execute(
            """SELECT job_id AS id,status,result,error,attempts,created_at,started_at,completed_at
               FROM jobs WHERE organization_id=%s AND job_id=%s AND job_type='risk.analysis'""",
            (user.organization_id, job_id),
        ).fetchone()
    return row
