"""Evidence-backed business risk-event portfolio API."""

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from psycopg.types.json import Jsonb

from backend.app.auth import AuthUser, require_security
from backend.data_access import demo_mode_enabled
from backend.database.connection import get_connection
from backend.financial_engine.events import RiskEvent
from backend.services.audit import record_audit_event

router = APIRouter()


class EvidencedRiskEvent(RiskEvent):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    observed_at: datetime
    valid_until: datetime


class RiskEventBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    events: list[EvidencedRiskEvent] = Field(min_length=1, max_length=1000)


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    iterations: int = Field(default=10000, ge=1000, le=100000)
    seed: int = Field(default=42, ge=0, le=2**32 - 1)


@router.post("/events", status_code=status.HTTP_201_CREATED)
def ingest_events(body: RiskEventBatch, user: AuthUser = Depends(require_security)):
    if demo_mode_enabled():
        raise HTTPException(status_code=409, detail="Business risk evidence ingestion requires live mode")
    for event in body.events:
        if event.valid_until <= event.observed_at:
            raise HTTPException(status_code=422, detail=f"valid_until must follow observed_at for {event.event_id}")
    with get_connection() as db:
        for event in body.events:
            row = event.model_dump()
            db.execute(
                """INSERT INTO business_risk_events(organization_id,event_key,category,annual_probability,
                     mean_loss_inr,loss_coefficient_of_variation,frequency_evidence,loss_evidence,
                     shock_group,control_probability_reduction,control_evidence,observed_at,valid_until)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT(organization_id,event_key,observed_at) DO UPDATE SET
                     category=EXCLUDED.category,annual_probability=EXCLUDED.annual_probability,
                     mean_loss_inr=EXCLUDED.mean_loss_inr,
                     loss_coefficient_of_variation=EXCLUDED.loss_coefficient_of_variation,
                     frequency_evidence=EXCLUDED.frequency_evidence,loss_evidence=EXCLUDED.loss_evidence,
                     shock_group=EXCLUDED.shock_group,
                     control_probability_reduction=EXCLUDED.control_probability_reduction,
                     control_evidence=EXCLUDED.control_evidence,valid_until=EXCLUDED.valid_until,active=TRUE""",
                (user.organization_id, row["event_id"], row["category"], row["annual_probability"],
                 row["mean_loss_inr"], row["loss_coefficient_of_variation"], row["frequency_evidence"],
                 row["loss_evidence"], row["shock_group"], row["control_probability_reduction"],
                 row["control_evidence"], row["observed_at"], row["valid_until"]),
            )
    record_audit_event(user.organization_id, user.user_id, "business_risk.events_ingested",
                       "business_risk_event", "batch", {"count": len(body.events)})
    return {"ingested": len(body.events), "data_origin": "LIVE"}


@router.get("/events")
def list_events(current_only: bool = Query(True), user: AuthUser = Depends(require_security)):
    current = "AND observed_at <= NOW() AND valid_until > NOW()" if current_only else ""
    with get_connection() as db:
        rows = db.execute(
            f"""SELECT event_key AS event_id,category,annual_probability,mean_loss_inr,
                       loss_coefficient_of_variation,frequency_evidence,loss_evidence,shock_group,
                       control_probability_reduction,control_evidence,observed_at,valid_until,active
                FROM business_risk_events WHERE organization_id=%s AND active=TRUE {current}
                ORDER BY event_key,observed_at DESC""", (user.organization_id,),
        ).fetchall()
    return {"events": rows, "count": len(rows), "current_only": current_only}


@router.post("/simulate", status_code=status.HTTP_202_ACCEPTED)
def simulate(body: SimulationRequest, user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        count = db.execute(
            """SELECT COUNT(*) AS count FROM business_risk_events WHERE organization_id=%s AND active=TRUE
               AND observed_at<=NOW() AND valid_until>NOW()""", (user.organization_id,),
        ).fetchone()["count"]
        if not count:
            raise HTTPException(status_code=409, detail="No current evidenced business risk events exist")
        job_id = uuid4()
        job = db.execute(
            """INSERT INTO jobs(job_id,organization_id,job_type,payload)
               VALUES (%s,%s,'business_risk.simulate',%s)
               RETURNING job_id AS id,status,created_at""",
            (job_id, user.organization_id, Jsonb({"iterations": body.iterations, "seed": body.seed,
                                                  "requested_by": str(user.user_id)})),
        ).fetchone()
    return job


@router.get("/runs/latest")
def latest_run(user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        row = db.execute(
            """SELECT run_id,input_hash,result,created_at FROM business_risk_runs
               WHERE organization_id=%s ORDER BY created_at DESC LIMIT 1""", (user.organization_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No completed business risk simulation exists")
    return row
