"""Bug Bounty connector backed by the demo JSON dataset."""

import json
from pathlib import Path

from psycopg import Error as PsycopgError

from backend.database.connection import get_connection


DATA_PATH = Path(__file__).resolve().parents[3] / "data/demo/bug_bounty.json"


def fetch_findings() -> list[dict]:
    with DATA_PATH.open(encoding="utf-8") as file:
        findings = json.load(file)
    try:
        with get_connection() as connection:
            reports = connection.execute(
                """
                SELECT report_id, title, asset_id, weakness, severity, cve,
                       created_at
                FROM bug_bounty_reports
                WHERE status = 'ACCEPTED'
                ORDER BY created_at
                """
            ).fetchall()
    except PsycopgError:
        # Keep demo findings available while PostgreSQL is starting or when the
        # API is intentionally run without its database.
        return findings

    findings.extend(
        {
            "finding_id": f"BB-{str(report['report_id']).split('-')[0].upper()}",
            "source_type": "BUG_BOUNTY",
            "source_name": "CRISPR Bug Bounty",
            "asset_id": report["asset_id"],
            "finding_type": report["weakness"],
            "title": report["title"],
            "cve": report["cve"],
            "severity": report["severity"],
            "confidence": 1.0,
            "first_seen": report["created_at"].date().isoformat(),
            "status": "VALIDATED",
        }
        for report in reports
    )
    return findings


def get_source_info() -> dict:
    return {"name": "Bug Bounty", "status": "connected", "count": len(fetch_findings())}
