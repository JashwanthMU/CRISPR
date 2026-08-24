"""Database-backed ingestion store shared by connectors and APIs."""

import json
from pathlib import Path

from psycopg.types.json import Jsonb

from backend.database.connection import get_connection


DATA_DIR = Path(__file__).resolve().parents[2] / "data/demo"
SOURCE_FILES = {
    "BUG_BOUNTY": "bug_bounty.json",
    "VULNERABILITY_SCANNER": "vulnerabilities.json",
    "EDR": "edr_events.json",
    "XDR": "xdr_events.json",
    "SIEM": "siem_events.json",
    "IAM": "iam.json",
    "THREAT_INTEL": "threat_intel.json",
}


def load_json(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def upsert_assets(assets: list[dict]) -> int:
    with get_connection() as connection:
        for asset in assets:
            connection.execute(
                """
                INSERT INTO assets (asset_id, payload)
                VALUES (%s, %s)
                ON CONFLICT (asset_id) DO UPDATE
                SET payload = EXCLUDED.payload, updated_at = NOW()
                """,
                (asset["asset_id"], Jsonb(asset)),
            )
    return len(assets)


def upsert_findings(findings: list[dict]) -> int:
    with get_connection() as connection:
        for finding in findings:
            connection.execute(
                """
                INSERT INTO findings (
                    finding_id, source_type, source_name, asset_id,
                    payload, first_seen
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (finding_id) DO UPDATE SET
                    source_type = EXCLUDED.source_type,
                    source_name = EXCLUDED.source_name,
                    asset_id = EXCLUDED.asset_id,
                    payload = EXCLUDED.payload,
                    first_seen = EXCLUDED.first_seen,
                    ingested_at = NOW()
                """,
                (
                    finding["finding_id"],
                    finding["source_type"],
                    finding["source_name"],
                    finding["asset_id"],
                    Jsonb(finding),
                    finding.get("first_seen"),
                ),
            )
    return len(findings)


def refresh_demo_sources() -> dict:
    result = {"ASSETS": upsert_assets(load_json("assets.json"))}
    for source_type, filename in SOURCE_FILES.items():
        result[source_type] = upsert_findings(load_json(filename))
    return result


def fetch_findings(source_type: str | None = None) -> list[dict]:
    query = "SELECT payload FROM findings"
    parameters = ()
    if source_type:
        query += " WHERE source_type = %s"
        parameters = (source_type,)
    query += " ORDER BY first_seen DESC NULLS LAST, finding_id"
    with get_connection() as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [row["payload"] for row in rows]


def ingestion_status() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT source_type, COUNT(*) AS count, MAX(ingested_at) AS last_ingested_at
            FROM findings GROUP BY source_type ORDER BY source_type
            """
        ).fetchall()
    return rows
