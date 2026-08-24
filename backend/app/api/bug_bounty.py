"""Researcher submission and security-team triage APIs."""

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from psycopg import OperationalError

from backend.app.auth import AuthUser, UserRole, get_current_user, require_security
from backend.database.connection import get_connection


router = APIRouter()


class ReportStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ReportCreate(BaseModel):
    title: str = Field(min_length=8, max_length=240)
    asset_id: str = Field(min_length=2, max_length=32)
    weakness: str = Field(min_length=2, max_length=120)
    severity: Severity
    description: str = Field(min_length=20, max_length=10_000)
    impact: str = Field(min_length=10, max_length=5_000)
    reproduction_steps: str = Field(min_length=10, max_length=10_000)
    remediation: str | None = Field(default=None, max_length=5_000)
    cve: str | None = Field(default=None, max_length=32)


class ReviewRequest(BaseModel):
    decision: ReportStatus
    triage_notes: str = Field(min_length=3, max_length=5_000)


def _database_unavailable(error: OperationalError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="PostgreSQL is unavailable. Start it with docker compose up db.",
    )


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def submit_report(
    payload: ReportCreate, user: AuthUser = Depends(get_current_user)
) -> dict:
    report_id = uuid4()
    try:
        with get_connection() as connection:
            report = connection.execute(
                """
                INSERT INTO bug_bounty_reports (
                    report_id, reporter_user_id, reporter_name, reporter_email,
                    title, asset_id,
                    weakness, severity, description, impact, reproduction_steps,
                    remediation, cve
                ) VALUES (
                    %(report_id)s, %(reporter_user_id)s, %(reporter_name)s,
                    %(reporter_email)s,
                    %(title)s, %(asset_id)s, %(weakness)s, %(severity)s,
                    %(description)s, %(impact)s, %(reproduction_steps)s,
                    %(remediation)s, %(cve)s
                )
                RETURNING *
                """,
                {
                    "report_id": report_id,
                    "reporter_user_id": user.user_id,
                    "reporter_name": user.name,
                    "reporter_email": str(user.email),
                    **payload.model_dump(mode="json"),
                },
            ).fetchone()
    except OperationalError as error:
        raise _database_unavailable(error) from error
    return report


@router.get("/reports")
def list_reports(
    report_status: ReportStatus | None = Query(default=None, alias="status"),
    user: AuthUser = Depends(get_current_user),
) -> dict:
    query = "SELECT * FROM bug_bounty_reports"
    conditions = []
    parameters = {}
    if user.role != UserRole.SECURITY:
        conditions.append("reporter_user_id = %(user_id)s")
        parameters["user_id"] = user.user_id
    if report_status:
        conditions.append("status = %(status)s")
        parameters["status"] = report_status.value
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC"
    try:
        with get_connection() as connection:
            reports = connection.execute(query, parameters).fetchall()
    except OperationalError as error:
        raise _database_unavailable(error) from error
    return {"total": len(reports), "reports": reports}


@router.get("/reports/{report_id}")
def get_report(
    report_id: UUID, user: AuthUser = Depends(get_current_user)
) -> dict:
    try:
        with get_connection() as connection:
            report = connection.execute(
                "SELECT * FROM bug_bounty_reports WHERE report_id = %s",
                (report_id,),
            ).fetchone()
    except OperationalError as error:
        raise _database_unavailable(error) from error
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if user.role != UserRole.SECURITY and report["reporter_user_id"] != user.user_id:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/reports/{report_id}/review")
def review_report(
    report_id: UUID,
    payload: ReviewRequest,
    security_user: AuthUser = Depends(require_security),
) -> dict:
    if payload.decision == ReportStatus.SUBMITTED:
        raise HTTPException(status_code=422, detail="Decision must be ACCEPTED or REJECTED")
    try:
        with get_connection() as connection:
            report = connection.execute(
                """
                UPDATE bug_bounty_reports
                SET status = %(status)s,
                    triage_notes = %(triage_notes)s,
                    reviewed_by = %(reviewed_by)s,
                    updated_at = %(updated_at)s
                WHERE report_id = %(report_id)s
                RETURNING *
                """,
                {
                    "status": payload.decision.value,
                    "triage_notes": payload.triage_notes,
                    "reviewed_by": security_user.name,
                    "updated_at": datetime.now(timezone.utc),
                    "report_id": report_id,
                },
            ).fetchone()
    except OperationalError as error:
        raise _database_unavailable(error) from error
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
