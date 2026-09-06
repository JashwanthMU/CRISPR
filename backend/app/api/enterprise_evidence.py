"""Provider-neutral APIs for evidence supplied by customer systems."""

from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from psycopg.types.json import Jsonb

from backend.app.auth import AuthUser, require_security
from backend.data_access import demo_mode_enabled
from backend.database.connection import get_connection
from backend.services.audit import record_audit_event

router = APIRouter()


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class TelemetryEvent(StrictModel):
    external_event_id: str = Field(min_length=1, max_length=255)
    event_type: str = Field(min_length=1, max_length=120)
    observed_at: datetime
    asset_id: str | None = Field(default=None, max_length=255)
    identity_id: str | None = Field(default=None, max_length=255)
    severity: str | None = Field(default=None, max_length=40)
    payload: dict[str, Any] = Field(default_factory=dict)


class TelemetryBatch(StrictModel):
    source_name: str = Field(min_length=2, max_length=160)
    events: list[TelemetryEvent] = Field(min_length=1, max_length=10000)


class RelationshipEdge(StrictModel):
    external_edge_id: str = Field(min_length=1, max_length=255)
    source_node: str = Field(min_length=1, max_length=255)
    target_node: str = Field(min_length=1, max_length=255)
    relation_type: str = Field(min_length=1, max_length=120)
    source_kind: str = Field(min_length=1, max_length=80)
    target_kind: str = Field(min_length=1, max_length=80)
    target_asset_id: str | None = Field(default=None, max_length=255)
    confidence: float = Field(ge=0, le=1)
    observed_at: datetime
    valid_until: datetime | None = None
    evidence: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def valid_window(self):
        if self.valid_until and self.valid_until <= self.observed_at:
            raise ValueError("valid_until must follow observed_at")
        return self


class RelationshipBatch(StrictModel):
    source_name: str = Field(min_length=2, max_length=160)
    edges: list[RelationshipEdge] = Field(min_length=1, max_length=10000)


class ComplianceRequirement(StrictModel):
    framework: str = Field(min_length=1, max_length=120)
    requirement_ref: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=4000)
    weight: float = Field(default=1, gt=0, le=1000)


class RequirementBatch(StrictModel):
    requirements: list[ComplianceRequirement] = Field(min_length=1, max_length=5000)


class ComplianceEvidence(StrictModel):
    framework: str = Field(min_length=1, max_length=120)
    requirement_ref: str = Field(min_length=1, max_length=120)
    status: Literal["COMPLIANT", "NON_COMPLIANT", "UNKNOWN"]
    source_name: str = Field(min_length=2, max_length=160)
    evidence_reference: str = Field(min_length=3, max_length=2000)
    asset_id: str | None = Field(default=None, max_length=255)
    financial_impact_inr: float | None = Field(default=None, ge=0)
    confidence: float = Field(ge=0, le=1)
    observed_at: datetime
    valid_until: datetime
    payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def valid_window(self):
        if self.valid_until <= self.observed_at:
            raise ValueError("valid_until must follow observed_at")
        return self


class ComplianceEvidenceBatch(StrictModel):
    evidence: list[ComplianceEvidence] = Field(min_length=1, max_length=10000)


def _require_live() -> None:
    if demo_mode_enabled():
        raise HTTPException(status_code=409, detail="Enterprise evidence ingestion requires live mode")


@router.post("/telemetry", status_code=status.HTTP_201_CREATED)
def ingest_telemetry(body: TelemetryBatch, user: AuthUser = Depends(require_security)):
    _require_live()
    with get_connection() as db:
        for event in body.events:
            db.execute(
                """INSERT INTO telemetry_events(organization_id,source_name,external_event_id,event_type,
                     asset_id,identity_id,severity,observed_at,payload)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT(organization_id,source_name,external_event_id) DO UPDATE SET
                     event_type=EXCLUDED.event_type,asset_id=EXCLUDED.asset_id,identity_id=EXCLUDED.identity_id,
                     severity=EXCLUDED.severity,observed_at=EXCLUDED.observed_at,payload=EXCLUDED.payload,
                     ingested_at=NOW()""",
                (user.organization_id, body.source_name, event.external_event_id, event.event_type,
                 event.asset_id, event.identity_id, event.severity, event.observed_at, Jsonb(event.payload)),
            )
    record_audit_event(user.organization_id, user.user_id, "telemetry.ingested", "source", body.source_name,
                       {"count": len(body.events)})
    return {"ingested": len(body.events), "source_name": body.source_name, "data_origin": "LIVE"}


@router.post("/relationships", status_code=status.HTTP_201_CREATED)
def ingest_relationships(body: RelationshipBatch, user: AuthUser = Depends(require_security)):
    _require_live()
    with get_connection() as db:
        for edge in body.edges:
            db.execute(
                """INSERT INTO relationship_edges(organization_id,source_name,external_edge_id,source_node,
                     target_node,relation_type,source_kind,target_kind,target_asset_id,confidence,
                     observed_at,valid_until,evidence)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT(organization_id,source_name,external_edge_id) DO UPDATE SET
                     source_node=EXCLUDED.source_node,target_node=EXCLUDED.target_node,
                     relation_type=EXCLUDED.relation_type,source_kind=EXCLUDED.source_kind,
                     target_kind=EXCLUDED.target_kind,target_asset_id=EXCLUDED.target_asset_id,
                     confidence=EXCLUDED.confidence,observed_at=EXCLUDED.observed_at,
                     valid_until=EXCLUDED.valid_until,evidence=EXCLUDED.evidence,ingested_at=NOW()""",
                (user.organization_id, body.source_name, edge.external_edge_id, edge.source_node,
                 edge.target_node, edge.relation_type, edge.source_kind, edge.target_kind,
                 edge.target_asset_id, edge.confidence, edge.observed_at, edge.valid_until, Jsonb(edge.evidence)),
            )
    return {"ingested": len(body.edges), "source_name": body.source_name, "data_origin": "LIVE"}


@router.post("/compliance/requirements", status_code=status.HTTP_201_CREATED)
def ingest_requirements(body: RequirementBatch, user: AuthUser = Depends(require_security)):
    _require_live()
    with get_connection() as db:
        for row in body.requirements:
            db.execute(
                """INSERT INTO compliance_requirements(organization_id,framework,requirement_ref,title,description,weight)
                   VALUES (%s,%s,%s,%s,%s,%s)
                   ON CONFLICT(organization_id,framework,requirement_ref) DO UPDATE SET
                     title=EXCLUDED.title,description=EXCLUDED.description,weight=EXCLUDED.weight,active=TRUE""",
                (user.organization_id, row.framework, row.requirement_ref, row.title, row.description, row.weight),
            )
    return {"ingested": len(body.requirements), "data_origin": "LIVE"}


@router.post("/compliance/evidence", status_code=status.HTTP_201_CREATED)
def ingest_compliance_evidence(body: ComplianceEvidenceBatch, user: AuthUser = Depends(require_security)):
    _require_live()
    inserted = 0
    with get_connection() as db:
        for row in body.evidence:
            requirement = db.execute(
                """SELECT requirement_id FROM compliance_requirements
                   WHERE organization_id=%s AND framework=%s AND requirement_ref=%s AND active=TRUE""",
                (user.organization_id, row.framework, row.requirement_ref),
            ).fetchone()
            if not requirement:
                raise HTTPException(status_code=422, detail=f"Unknown requirement {row.framework}/{row.requirement_ref}")
            db.execute(
                """INSERT INTO compliance_evidence(organization_id,requirement_id,status,source_name,
                     evidence_reference,asset_id,financial_impact_inr,confidence,observed_at,valid_until,payload)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (user.organization_id, requirement["requirement_id"], row.status, row.source_name,
                 row.evidence_reference, row.asset_id, row.financial_impact_inr, row.confidence,
                 row.observed_at, row.valid_until, Jsonb(row.payload)),
            )
            inserted += 1
    return {"ingested": inserted, "data_origin": "LIVE"}
