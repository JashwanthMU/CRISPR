"""Canonical data access with an explicit boundary between live and demo data."""

import json
import os
from contextvars import ContextVar
from pathlib import Path

from psycopg import Error as PsycopgError

from backend.database.connection import get_connection


DATA_DIR = Path(__file__).resolve().parents[1] / "data/demo"
_active_organization: ContextVar[object | None] = ContextVar("active_organization", default=None)


class LiveDataUnavailable(RuntimeError):
    """Raised when a live calculation cannot be supported by persisted data."""


def set_active_organization(organization_id) -> None:
    _active_organization.set(organization_id)


def organization_data_mode(organization_id=None) -> str:
    deployment_mode = os.getenv("CRISPR_DATA_MODE", "live").strip().upper()
    # Explicit demo deployments and the test process remain entirely sandboxed.
    if deployment_mode == "DEMO":
        return "DEMO"
    organization_id = organization_id or _active_organization.get()
    if organization_id is None:
        return deployment_mode
    try:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT data_mode FROM organizations WHERE organization_id=%s", (organization_id,)
            ).fetchone()
        if not row:
            raise LiveDataUnavailable("Organization does not exist")
        return row["data_mode"]
    except PsycopgError as error:
        raise LiveDataUnavailable("Organization mode is unavailable") from error


def demo_mode_enabled(organization_id=None) -> bool:
    return organization_data_mode(organization_id) == "DEMO"


def require_demo_mode(feature: str, organization_id=None) -> None:
    """Prevent a fixture-only feature from masquerading as live data."""
    if not demo_mode_enabled(organization_id):
        raise LiveDataUnavailable(
            f"{feature} has no persisted live-data implementation yet; fixture response refused"
        )


def _demo_rows(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def load_assets(organization_id=None) -> list[dict]:
    is_demo = demo_mode_enabled(organization_id)
    if is_demo:
        return _demo_rows("assets.json")
    try:
        with get_connection() as connection:
            query = "SELECT payload FROM assets"
            conditions, parameters = [], []
            if not is_demo:
                conditions.append("data_origin = 'LIVE'")
            if organization_id is not None:
                conditions.append("organization_id = %s")
                parameters.append(organization_id)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            rows = connection.execute(query + " ORDER BY asset_id", parameters).fetchall()
        if not rows and not is_demo:
            raise LiveDataUnavailable("No LIVE assets have been ingested")
        return [row["payload"] for row in rows]
    except LiveDataUnavailable:
        raise
    except (PsycopgError, RuntimeError) as error:
        if is_demo:
            return _demo_rows("assets.json")
        raise LiveDataUnavailable("Live asset inventory is unavailable") from error


def load_findings(source_type: str | None = None, organization_id=None) -> list[dict]:
    filenames = {
        "VULNERABILITY_SCANNER": "vulnerabilities.json",
        "BUG_BOUNTY": "bug_bounty.json",
        "EDR": "edr_events.json",
        "XDR": "xdr_events.json",
        "SIEM": "siem_events.json",
        "IAM": "iam.json",
        "THREAT_INTEL": "threat_intel.json",
    }
    is_demo = demo_mode_enabled(organization_id)
    if is_demo:
        if source_type:
            return _demo_rows(filenames[source_type]) if source_type in filenames else []
        result = []
        for filename in filenames.values():
            result.extend(_demo_rows(filename))
        return result
    query = "SELECT payload FROM findings"
    parameters = []
    conditions = []
    if not is_demo:
        conditions.append("data_origin = 'LIVE'")
    if source_type:
        conditions.append("source_type = %s")
        parameters.append(source_type)
    if organization_id is not None:
        conditions.append("organization_id = %s")
        parameters.append(organization_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY first_seen DESC NULLS LAST, finding_id"
    try:
        with get_connection() as connection:
            rows = connection.execute(query, parameters).fetchall()
        if not rows and not is_demo:
            qualifier = f" for source {source_type}" if source_type else ""
            raise LiveDataUnavailable(f"No LIVE findings have been ingested{qualifier}")
        return [row["payload"] for row in rows]
    except LiveDataUnavailable:
        raise
    except (PsycopgError, RuntimeError) as error:
        if not is_demo:
            raise LiveDataUnavailable("Live findings are unavailable") from error
        if source_type:
            return _demo_rows(filenames[source_type]) if source_type in filenames else []
        result = []
        for filename in filenames.values():
            result.extend(_demo_rows(filename))
        return result


def load_control_posture(asset_id: str, organization_id=None) -> dict:
    is_demo = demo_mode_enabled(organization_id)
    if is_demo:
        from backend.controls.effectiveness import DEMO_CONTROLS

        return DEMO_CONTROLS.get(asset_id, {})
    try:
        with get_connection() as connection:
            query = "SELECT payload FROM control_postures WHERE asset_id = %s AND data_origin = %s"
            parameters = [asset_id, "DEMO" if is_demo else "LIVE"]
            if organization_id is not None:
                query += " AND organization_id = %s"
                parameters.append(organization_id)
            row = connection.execute(query, parameters).fetchone()
    except (PsycopgError, RuntimeError) as error:
        if not is_demo:
            raise LiveDataUnavailable(
                f"Live control posture is unavailable for asset {asset_id}"
            ) from error
        row = None
    if row:
        return row["payload"]
    if is_demo:
        from backend.controls.effectiveness import DEMO_CONTROLS

        return DEMO_CONTROLS.get(asset_id, {})
    raise LiveDataUnavailable(f"No live control posture exists for asset {asset_id}")


def load_control_catalog(organization_id=None) -> list[dict]:
    """Load approved control costs; live mode never uses the demo cost catalogue."""
    is_demo = demo_mode_enabled(organization_id)
    if is_demo:
        return _demo_rows("control_catalog.json")
    try:
        with get_connection() as connection:
            query = "SELECT payload FROM control_catalog WHERE data_origin = %s"
            parameters = ["DEMO" if is_demo else "LIVE"]
            if organization_id is not None:
                query += " AND organization_id = %s"
                parameters.append(organization_id)
            rows = connection.execute(query + " ORDER BY control_id", parameters).fetchall()
    except (PsycopgError, RuntimeError) as error:
        if not is_demo:
            raise LiveDataUnavailable("Approved live control costs are unavailable") from error
        rows = []
    if rows:
        return [row["payload"] for row in rows]
    if is_demo:
        return _demo_rows("control_catalog.json")
    raise LiveDataUnavailable(
        "No approved LIVE control catalogue has been ingested; optimization refused"
    )
