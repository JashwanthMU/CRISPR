"""Model governance, validation evidence, and drift-status APIs."""

from uuid import uuid4

from fastapi import APIRouter, Depends, Query, status
from psycopg.types.json import Jsonb

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.services.audit import record_audit_event
from ml.incident_prediction.model import get_model_info

router = APIRouter()


def _enqueue(job_type: str, user: AuthUser) -> dict:
    job_id = uuid4()
    with get_connection() as db:
        row = db.execute(
            """INSERT INTO jobs(job_id,organization_id,job_type,payload)
               VALUES (%s,%s,%s,%s) RETURNING job_id AS id,status,created_at""",
            (job_id, user.organization_id, job_type, Jsonb({"requested_by": str(user.user_id)})),
        ).fetchone()
    record_audit_event(user.organization_id, user.user_id, f"{job_type}.requested", "job", str(job_id))
    return row


@router.get("/status")
def governance_status(user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        validation = db.execute(
            """SELECT validation_id,model_version,status,evidence,created_at
               FROM model_validation_runs WHERE organization_id=%s ORDER BY created_at DESC LIMIT 1""",
            (user.organization_id,),
        ).fetchone()
        drift = db.execute(
            """SELECT drift_report_id,model_version,status,evidence,created_at
               FROM model_drift_reports WHERE organization_id=%s ORDER BY created_at DESC LIMIT 1""",
            (user.organization_id,),
        ).fetchone()
    return {
        "model": get_model_info(),
        "latest_validation": validation,
        "latest_drift_report": drift,
        "approval": {
            "prioritization": "APPROVED" if validation and validation["status"] == "PASS" else "PENDING_VALIDATION",
            "direct_eal_probability": "NOT_APPROVED",
            "reason": "The trained target is CISA KEV membership, not annual incident frequency.",
        },
    }


@router.post("/validate", status_code=status.HTTP_202_ACCEPTED)
def request_validation(user: AuthUser = Depends(require_security)):
    return _enqueue("model.validation", user)


@router.post("/drift", status_code=status.HTTP_202_ACCEPTED)
def request_drift_assessment(user: AuthUser = Depends(require_security)):
    return _enqueue("model.drift", user)


@router.get("/validations")
def validations(limit: int = Query(50, ge=1, le=200), user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        rows = db.execute(
            """SELECT validation_id,job_id,model_version,validation_type,status,evidence,created_at
               FROM model_validation_runs WHERE organization_id=%s ORDER BY created_at DESC LIMIT %s""",
            (user.organization_id, limit),
        ).fetchall()
    return {"validations": rows}


@router.get("/drift-reports")
def drift_reports(limit: int = Query(50, ge=1, le=200), user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        rows = db.execute(
            """SELECT drift_report_id,job_id,model_version,status,evidence,created_at
               FROM model_drift_reports WHERE organization_id=%s ORDER BY created_at DESC LIMIT %s""",
            (user.organization_id, limit),
        ).fetchall()
    return {"drift_reports": rows}
