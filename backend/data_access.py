"""Canonical data access with an explicit boundary between live and demo data."""

import json
import os
from pathlib import Path

from psycopg import Error as PsycopgError

from backend.database.connection import get_connection


DATA_DIR = Path(__file__).resolve().parents[1] / "data/demo"


class LiveDataUnavailable(RuntimeError):
    """Raised when a live calculation cannot be supported by persisted data."""


def demo_mode_enabled() -> bool:
    return os.getenv("CRISPR_DATA_MODE", "live").strip().lower() == "demo"


def require_demo_mode(feature: str) -> None:
    """Prevent a fixture-only feature from masquerading as live data."""
    if not demo_mode_enabled():
        raise LiveDataUnavailable(
            f"{feature} has no persisted live-data implementation yet; fixture response refused"
        )


def _demo_rows(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def load_assets() -> list[dict]:
    try:
        with get_connection() as connection:
            query = "SELECT payload FROM assets"
            if not demo_mode_enabled():
                query += " WHERE data_origin = 'LIVE'"
            rows = connection.execute(query + " ORDER BY asset_id").fetchall()
        if not rows and not demo_mode_enabled():
            raise LiveDataUnavailable("No LIVE assets have been ingested")
        return [row["payload"] for row in rows]
    except LiveDataUnavailable:
        raise
    except (PsycopgError, RuntimeError) as error:
        if demo_mode_enabled():
            return _demo_rows("assets.json")
        raise LiveDataUnavailable("Live asset inventory is unavailable") from error


def load_findings(source_type: str | None = None) -> list[dict]:
    query = "SELECT payload FROM findings"
    parameters = ()
    conditions = []
    if not demo_mode_enabled():
        conditions.append("data_origin = 'LIVE'")
    if source_type:
        conditions.append("source_type = %s")
        parameters = (source_type,)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY first_seen DESC NULLS LAST, finding_id"
    try:
        with get_connection() as connection:
            rows = connection.execute(query, parameters).fetchall()
        if not rows and not demo_mode_enabled():
            qualifier = f" for source {source_type}" if source_type else ""
            raise LiveDataUnavailable(f"No LIVE findings have been ingested{qualifier}")
        return [row["payload"] for row in rows]
    except LiveDataUnavailable:
        raise
    except (PsycopgError, RuntimeError) as error:
        if not demo_mode_enabled():
            raise LiveDataUnavailable("Live findings are unavailable") from error
        filenames = {
            "VULNERABILITY_SCANNER": "vulnerabilities.json",
            "BUG_BOUNTY": "bug_bounty.json",
            "EDR": "edr_events.json",
            "XDR": "xdr_events.json",
            "SIEM": "siem_events.json",
            "IAM": "iam.json",
            "THREAT_INTEL": "threat_intel.json",
        }
        if source_type:
            return _demo_rows(filenames[source_type]) if source_type in filenames else []
        result = []
        for filename in filenames.values():
            result.extend(_demo_rows(filename))
        return result


def load_control_posture(asset_id: str) -> dict:
    try:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT payload FROM control_postures WHERE asset_id = %s AND data_origin = %s",
                (asset_id, "DEMO" if demo_mode_enabled() else "LIVE"),
            ).fetchone()
    except (PsycopgError, RuntimeError) as error:
        if not demo_mode_enabled():
            raise LiveDataUnavailable(
                f"Live control posture is unavailable for asset {asset_id}"
            ) from error
        row = None
    if row:
        return row["payload"]
    if demo_mode_enabled():
        from backend.controls.effectiveness import DEMO_CONTROLS

        return DEMO_CONTROLS.get(asset_id, {})
    raise LiveDataUnavailable(f"No live control posture exists for asset {asset_id}")


def load_control_catalog() -> list[dict]:
    """Load approved control costs; live mode never uses the demo cost catalogue."""
    try:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT payload FROM control_catalog
                WHERE data_origin = %s ORDER BY control_id
                """,
                ("DEMO" if demo_mode_enabled() else "LIVE",),
            ).fetchall()
    except (PsycopgError, RuntimeError) as error:
        if not demo_mode_enabled():
            raise LiveDataUnavailable("Approved live control costs are unavailable") from error
        rows = []
    if rows:
        return [row["payload"] for row in rows]
    if demo_mode_enabled():
        return _demo_rows("control_catalog.json")
    raise LiveDataUnavailable(
        "No approved LIVE control catalogue has been ingested; optimization refused"
    )
