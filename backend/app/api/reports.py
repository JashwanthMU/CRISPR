"""Durable reports derived only from persisted platform data."""

from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from psycopg.types.json import Jsonb

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.services.audit import record_audit_event

router = APIRouter()


class ReportRequest(BaseModel):
    report_type: Literal["RISK_SUMMARY", "FINDINGS_DIGEST"]
    name: str = Field(min_length=2, max_length=240)
    format: Literal["JSON"] = "JSON"


@router.get("")
def list_reports(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                 user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        rows = db.execute(
            """SELECT report_id AS id,name,report_type AS type,format,status,created_at AS generated
               FROM generated_reports WHERE organization_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s""",
            (user.organization_id, limit, offset),
        ).fetchall()
    return {"reports": rows, "count": len(rows), "limit": limit, "offset": offset}


@router.post("", status_code=status.HTTP_202_ACCEPTED)
def generate(body: ReportRequest, user: AuthUser = Depends(require_security)):
    report_id, job_id = uuid4(), uuid4()
    with get_connection() as db:
        db.execute(
            """INSERT INTO generated_reports(report_id,organization_id,report_type,name,format,status,generated_by)
               VALUES (%s,%s,%s,%s,%s,'QUEUED',%s)""",
            (report_id, user.organization_id, body.report_type, body.name, body.format, user.user_id),
        )
        db.execute(
            """INSERT INTO jobs(job_id,organization_id,job_type,payload)
               VALUES (%s,%s,'report.generate',%s)""",
            (job_id, user.organization_id, Jsonb({"report_id": str(report_id), "report_type": body.report_type})),
        )
    record_audit_event(user.organization_id, user.user_id, "report.requested", "report", str(report_id))
    return {"id": report_id, "job_id": job_id, "status": "QUEUED"}


@router.get("/{report_id}")
def get_report(report_id: UUID, user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        row = db.execute(
            """SELECT report_id AS id,name,report_type AS type,format,status,content,created_at AS generated
               FROM generated_reports WHERE organization_id=%s AND report_id=%s""",
            (user.organization_id, report_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    return row
