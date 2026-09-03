"""Canonical, organization-scoped risk calculation and snapshot persistence."""

import hashlib
import json
from datetime import datetime, timezone
from uuid import UUID, NAMESPACE_URL, uuid4, uuid5

from psycopg.types.json import Jsonb

from backend.app.api.risks import _all_risks, calculate_enterprise_summary
from backend.data_access import demo_mode_enabled
from backend.database.connection import get_connection
from ml.incident_prediction.model import get_model_info


ASSUMPTIONS = {
    "currency": "INR",
    "finding_probability_aggregation": "1 - product(1 - finding_probability)",
    "finding_dependence": "independent",
    "loss_counting": "one loss magnitude per asset incident",
    "monte_carlo_seed": 42,
    "frequency_semantics": "latest unexpired organization-supplied annual incident probability",
    "kev_model_use": "prioritization only; excluded from EAL",
}


def _canonical_inputs(organization_id: UUID) -> dict:
    """Capture exact persisted records and timestamps used by an analysis."""
    origin = "DEMO" if demo_mode_enabled() else "LIVE"
    with get_connection() as db:
        assets = db.execute(
            """SELECT asset_id,payload,data_origin,updated_at FROM assets
               WHERE organization_id=%s AND data_origin=%s ORDER BY asset_id""",
            (organization_id, origin),
        ).fetchall()
        findings = db.execute(
            """SELECT finding_id,asset_id,payload,data_origin,ingested_at FROM findings
               WHERE organization_id=%s AND data_origin=%s AND source_type='VULNERABILITY_SCANNER'
               ORDER BY finding_id""",
            (organization_id, origin),
        ).fetchall()
        postures = db.execute(
            """SELECT asset_id,payload,data_origin,observed_at,updated_at FROM control_postures
               WHERE organization_id=%s AND data_origin=%s ORDER BY asset_id""",
            (organization_id, origin),
        ).fetchall()
        frequencies = db.execute(
            """SELECT assessment_id,finding_id,annual_incident_probability,methodology,
                      evidence_reference,source_name,confidence,observed_at,valid_until,created_at
               FROM incident_frequency_assessments WHERE organization_id=%s
               ORDER BY finding_id,observed_at,created_at""",
            (organization_id,),
        ).fetchall()
    return {"assets": assets, "findings": findings, "control_postures": postures,
            "incident_frequency_assessments": frequencies}


def _hash_inputs(inputs: dict) -> str:
    encoded = json.dumps(inputs, sort_keys=True, separators=(",", ":"), default=str).encode()
    return hashlib.sha256(encoded).hexdigest()


def run_and_persist_analysis(organization_id: UUID, requested_by: UUID | None = None) -> dict:
    inputs = _canonical_inputs(organization_id)
    input_hash = _hash_inputs(inputs)
    risks = _all_risks(organization_id)
    enterprise = calculate_enterprise_summary(organization_id)
    model = get_model_info()
    calculated_at = datetime.now(timezone.utc)
    origin = "DEMO" if demo_mode_enabled() else "LIVE"
    lineage = {
        "asset_ids": [row["asset_id"] for row in inputs["assets"]],
        "finding_ids": [row["finding_id"] for row in inputs["findings"]],
        "control_posture_asset_ids": [row["asset_id"] for row in inputs["control_postures"]],
        "frequency_assessment_ids": [str(row["assessment_id"]) for row in inputs["incident_frequency_assessments"]],
        "input_hash_algorithm": "SHA-256 over canonical persisted input records",
    }
    result = {
        "enterprise": enterprise,
        "risks": risks,
        "calculated_at": calculated_at.isoformat(),
        "data_origin": origin,
        "input_hash": input_hash,
    }
    snapshot_id = uuid4()
    grouped: dict[str, list[str]] = {}
    for risk in risks:
        grouped.setdefault(risk["asset_id"], []).append(risk["finding_id"])
    with get_connection() as db:
        for asset_id, finding_ids in grouped.items():
            risk_case_id = uuid5(NAMESPACE_URL, f"crispr:{organization_id}:{asset_id}")
            db.execute(
                """INSERT INTO risk_cases(risk_case_id,organization_id,asset_id,finding_ids,status)
                   VALUES (%s,%s,%s,%s,'ACTIVE')
                   ON CONFLICT(organization_id,asset_id) DO UPDATE SET
                     finding_ids=EXCLUDED.finding_ids,status='ACTIVE',updated_at=NOW()""",
                (risk_case_id, organization_id, asset_id, Jsonb(finding_ids)),
            )
        db.execute(
            """INSERT INTO risk_snapshots(
                 snapshot_id,organization_id,model_version,input_version,input_hash,
                 asset_count,finding_count,data_origin,requested_by,source_lineage,
                 assumptions,result,calculated_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (snapshot_id, organization_id, model.get("model_version", "unknown"),
             input_hash[:16], input_hash, len(inputs["assets"]), len(inputs["findings"]),
             origin, requested_by, Jsonb(lineage), Jsonb(ASSUMPTIONS), Jsonb(result), calculated_at),
        )
    return {"snapshot_id": str(snapshot_id), **result, "model_version": model.get("model_version", "unknown"),
            "asset_count": len(inputs["assets"]), "finding_count": len(inputs["findings"]),
            "source_lineage": lineage, "assumptions": ASSUMPTIONS}


def latest_snapshot(organization_id: UUID) -> dict | None:
    with get_connection() as db:
        return db.execute(
            """SELECT snapshot_id,model_version,input_version,input_hash,asset_count,finding_count,
                      data_origin,source_lineage,assumptions,result,calculated_at
               FROM risk_snapshots WHERE organization_id=%s
               ORDER BY calculated_at DESC LIMIT 1""",
            (organization_id,),
        ).fetchone()


def list_snapshots(organization_id: UUID, limit: int = 50, offset: int = 0) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT snapshot_id,model_version,input_version,input_hash,asset_count,finding_count,
                      data_origin,source_lineage,assumptions,calculated_at
               FROM risk_snapshots WHERE organization_id=%s
               ORDER BY calculated_at DESC LIMIT %s OFFSET %s""",
            (organization_id, limit, offset),
        ).fetchall()
