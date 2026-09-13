"""Database-backed ingestion store shared by connectors and APIs."""

import json
from datetime import datetime
from pathlib import Path
from uuid import UUID, uuid4

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
DEFAULT_ORGANIZATION_ID = UUID("00000000-0000-0000-0000-000000000001")
DEMO_ORGANIZATION_ID = UUID("00000000-0000-0000-0000-000000000002")


def load_json(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def upsert_assets(assets: list[dict], data_origin: str = "LIVE", organization_id: UUID = DEFAULT_ORGANIZATION_ID) -> int:
    if data_origin not in {"LIVE", "DEMO"}:
        raise ValueError("data_origin must be LIVE or DEMO")
    with get_connection() as connection:
        for asset in assets:
            connection.execute(
                """
                INSERT INTO assets (asset_id, payload, data_origin, organization_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (organization_id, asset_id) DO UPDATE
                SET payload = EXCLUDED.payload,
                    data_origin = EXCLUDED.data_origin,
                    updated_at = NOW()
                """,
                (asset["asset_id"], Jsonb(asset), data_origin, organization_id),
            )
    return len(assets)


def upsert_findings(findings: list[dict], data_origin: str = "LIVE", organization_id: UUID = DEFAULT_ORGANIZATION_ID) -> int:
    if data_origin not in {"LIVE", "DEMO"}:
        raise ValueError("data_origin must be LIVE or DEMO")
    with get_connection() as connection:
        for finding in findings:
            connection.execute(
                """
                INSERT INTO findings (
                    finding_id, source_type, source_name, asset_id,
                    payload, first_seen, data_origin, organization_id, severity, cve, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (organization_id, finding_id) DO UPDATE SET
                    source_type = EXCLUDED.source_type,
                    source_name = EXCLUDED.source_name,
                    asset_id = EXCLUDED.asset_id,
                    payload = EXCLUDED.payload,
                    first_seen = EXCLUDED.first_seen,
                    data_origin = EXCLUDED.data_origin,
                    severity = EXCLUDED.severity,
                    cve = EXCLUDED.cve,
                    status = EXCLUDED.status,
                    ingested_at = NOW()
                """,
                (
                    finding["finding_id"],
                    finding["source_type"],
                    finding["source_name"],
                    finding["asset_id"],
                    Jsonb(finding),
                    finding.get("first_seen"),
                    data_origin,
                    organization_id,
                    finding.get("severity"),
                    finding.get("cve"),
                    finding.get("status"),
                ),
            )
    return len(findings)


def upsert_control_postures(
    postures: list[dict], source_name: str, observed_at: datetime,
    data_origin: str = "LIVE", organization_id: UUID = DEFAULT_ORGANIZATION_ID,
) -> int:
    if data_origin not in {"LIVE", "DEMO"}:
        raise ValueError("data_origin must be LIVE or DEMO")
    with get_connection() as connection:
        for posture in postures:
            connection.execute(
                """
                INSERT INTO control_postures (
                    asset_id, payload, observed_at, source_name, data_origin, organization_id
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (organization_id, asset_id) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    observed_at = EXCLUDED.observed_at,
                    source_name = EXCLUDED.source_name,
                    data_origin = EXCLUDED.data_origin,
                    updated_at = NOW()
                """,
                (posture["asset_id"], Jsonb(posture), observed_at, source_name, data_origin, organization_id),
            )
    return len(postures)


def insert_frequency_assessments(
    assessments: list[dict], source_name: str, organization_id: UUID,
    created_by: UUID | None = None,
) -> int:
    """Append evidence rather than overwriting history; latest valid record wins."""
    with get_connection() as connection:
        for assessment in assessments:
            connection.execute(
                """INSERT INTO incident_frequency_assessments(
                     assessment_id,organization_id,finding_id,annual_incident_probability,
                     methodology,evidence_reference,source_name,confidence,observed_at,
                     valid_until,created_by)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (uuid4(), organization_id, assessment["finding_id"],
                 assessment["annual_incident_probability"], assessment["methodology"],
                 assessment["evidence_reference"], source_name, assessment["confidence"],
                 assessment["observed_at"], assessment["valid_until"], created_by),
            )
    return len(assessments)


def upsert_control_catalog(
    controls: list[dict],
    source_name: str,
    observed_at: datetime,
    data_origin: str = "LIVE",
    organization_id: UUID = DEFAULT_ORGANIZATION_ID,
) -> int:
    if data_origin not in {"LIVE", "DEMO"}:
        raise ValueError("data_origin must be LIVE or DEMO")
    with get_connection() as connection:
        for control in controls:
            connection.execute(
                """
                INSERT INTO control_catalog (
                    control_id, payload, source_name, observed_at, data_origin, organization_id
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (organization_id, control_id) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    source_name = EXCLUDED.source_name,
                    observed_at = EXCLUDED.observed_at,
                    data_origin = EXCLUDED.data_origin,
                    updated_at = NOW()
                """,
                (
                    control["id"], Jsonb(control), source_name,
                    observed_at, data_origin, organization_id,
                ),
            )
    return len(controls)


def seed_demo_platform_data(organization_id: UUID = DEMO_ORGANIZATION_ID) -> dict[str, int]:
    """Populate durable platform screens for the bundled demo tenant.

    Fixed identifiers and conflict-safe inserts keep startup repeatable while
    preserving any changes made through the UI after the first seed.
    """
    now = datetime.now().astimezone()
    projects = [
        ("10000000-0000-0000-0000-000000000001", "Digital Payments", "Payment gateway, settlement, and card services", "production"),
        ("10000000-0000-0000-0000-000000000002", "Customer Identity", "Authentication, onboarding, and KYC services", "production"),
        ("10000000-0000-0000-0000-000000000003", "Security Operations", "SOC monitoring and response tooling", "production"),
    ]
    policies = [
        ("20000000-0000-0000-0000-000000000001", "Privileged access requires MFA", "Require phishing-resistant MFA for every privileged account.", "NIST CSF", "PR.AA-03", "CRITICAL", True),
        ("20000000-0000-0000-0000-000000000002", "Critical vulnerabilities patched in 7 days", "Internet-facing critical findings must meet the seven-day remediation SLA.", "CIS Controls", "7.7", "HIGH", False),
        ("20000000-0000-0000-0000-000000000003", "Regulated data must be encrypted", "Encrypt regulated data at rest and in transit using approved cryptography.", "ISO/IEC 27001", "A.8.24", "HIGH", False),
        ("20000000-0000-0000-0000-000000000004", "Security logs retained for 180 days", "Retain searchable security telemetry for incident response and regulatory evidence.", "RBI CSF", "SOC-LOG-01", "MEDIUM", False),
    ]
    integrations = [
        ("30000000-0000-0000-0000-000000000001", "nessus", "Nessus Vulnerability Scanner", {"source": "demo", "schedule": "hourly", "items_ingested": 20}),
        ("30000000-0000-0000-0000-000000000002", "splunk", "Splunk SIEM", {"source": "demo", "index": "security", "items_ingested": 10}),
        ("30000000-0000-0000-0000-000000000003", "crowdstrike", "CrowdStrike EDR", {"source": "demo", "region": "ap-south-1", "items_ingested": 10}),
        ("30000000-0000-0000-0000-000000000004", "github", "GitHub Enterprise", {"source": "demo", "organization": "aegis-finance", "items_ingested": 7}),
    ]
    repositories = [
        ("40000000-0000-0000-0000-000000000001", "payments-api", "aegis-finance/payments-api", True, "main"),
        ("40000000-0000-0000-0000-000000000002", "customer-portal", "aegis-finance/customer-portal", True, "main"),
        ("40000000-0000-0000-0000-000000000003", "risk-analytics", "aegis-finance/risk-analytics", True, "develop"),
    ]
    sca = [
        ("50000000-0000-0000-0000-000000000001", repositories[0][0], "dependabot-184", "OPEN", "CRITICAL", "CVE-2025-29927", "next", "package.json", "< 15.2.3", "15.2.3"),
        ("50000000-0000-0000-0000-000000000002", repositories[0][0], "dependabot-192", "OPEN", "HIGH", "CVE-2024-45590", "body-parser", "package-lock.json", "< 1.20.3", "1.20.3"),
        ("50000000-0000-0000-0000-000000000003", repositories[1][0], "dependabot-088", "OPEN", "HIGH", "CVE-2025-22150", "undici", "package-lock.json", "< 6.21.1", "6.21.1"),
        ("50000000-0000-0000-0000-000000000004", repositories[2][0], "dependabot-041", "FIXED", "MEDIUM", "CVE-2024-47874", "starlette", "requirements.txt", "< 0.40.0", "0.40.0"),
    ]
    remediation = [
        ("60000000-0000-0000-0000-000000000001", "CYBER-101", "Patch authentication API remote-code-execution flaw", "VS001", "A003", "CRITICAL", "IN_PROGRESS", "Deploy the vendor patch and validate the API gateway.", 4860000, 16, 8, "ON_TRACK"),
        ("60000000-0000-0000-0000-000000000002", "CYBER-102", "Remediate payment database SQL injection", "VS002", "A002", "CRITICAL", "AT_RISK", "Patch the affected component and add parameterized-query tests.", 3920000, 24, 20, "AT_RISK"),
        ("60000000-0000-0000-0000-000000000003", "CYBER-103", "Enforce MFA for privileged identities", None, "A010", "HIGH", "NOT_STARTED", "Enroll remaining administrators and disable legacy authentication.", 2860000, 12, 12, "AVAILABLE"),
        ("60000000-0000-0000-0000-000000000004", "CYBER-104", "Harden public cloud storage configuration", None, "A008", "HIGH", "IN_PROGRESS", "Remove public access and enforce encryption and access logging.", 2140000, 18, 6, "ON_TRACK"),
    ]
    reports = [
        ("70000000-0000-0000-0000-000000000001", "RISK_SUMMARY", "Executive Cyber Risk Summary", {"period": "Current", "scope": "Enterprise", "data_origin": "DEMO"}),
        ("70000000-0000-0000-0000-000000000002", "FINDINGS_DIGEST", "Critical Findings Digest", {"period": "Last 30 days", "scope": "Open findings", "data_origin": "DEMO"}),
    ]
    with get_connection() as db:
        for row in projects:
            db.execute("""INSERT INTO projects(project_id,organization_id,name,description,environment)
                        VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING""", (UUID(row[0]), organization_id, *row[1:]))
        for row in policies:
            db.execute("""INSERT INTO policies(policy_id,organization_id,name,description,framework,framework_ref,severity,auto_remediate)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (policy_id) DO NOTHING""", (UUID(row[0]), organization_id, *row[1:]))
        for row in integrations:
            db.execute("""INSERT INTO integrations(integration_id,organization_id,provider,name,config,status,last_verified_at,last_sync_at)
                        VALUES (%s,%s,%s,%s,%s,'connected',%s,%s)
                        ON CONFLICT (organization_id,provider,name) DO UPDATE SET config=EXCLUDED.config,status='connected',
                        last_verified_at=EXCLUDED.last_verified_at,last_sync_at=EXCLUDED.last_sync_at""",
                       (UUID(row[0]), organization_id, row[1], row[2], Jsonb(row[3]), now, now))
        github_id = UUID(integrations[-1][0])
        for row in repositories:
            db.execute("""INSERT INTO repositories(repository_id,organization_id,integration_id,external_id,full_name,private,default_branch,
                        html_url,pushed_at,raw) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (organization_id,external_id) DO UPDATE SET raw=EXCLUDED.raw,pushed_at=EXCLUDED.pushed_at""",
                       (UUID(row[0]), organization_id, github_id, row[1], row[2], row[3], row[4], f"https://github.com/{row[2]}", now,
                        Jsonb({"data_origin": "DEMO", "provider": "github", "securityScore": 78 if row[1] == "payments-api" else 84,
                               "criticalIssues": 1 if row[1] == "payments-api" else 0, "openVulnerabilities": 2 if row[1] == "payments-api" else 1,
                               "secrets": 1 if row[1] == "payments-api" else 0, "dependencies": 146, "iacIssues": 2,
                               "language": "Python" if row[1] == "risk-analytics" else "TypeScript", "owners": ["Application Security"],
                               "issues": {"critical": 1 if row[1] == "payments-api" else 0, "high": 1, "medium": 2, "low": 1}})))
        for row in sca:
            db.execute("""INSERT INTO sca_findings(sca_finding_id,organization_id,repository_id,external_id,state,severity,cve,
                        package_name,manifest_path,vulnerable_range,patched_version,raw) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT DO NOTHING""", (UUID(row[0]), organization_id, UUID(row[1]), *row[2:], Jsonb({"data_origin": "DEMO"})))
        for row in remediation:
            db.execute("""INSERT INTO remediation_items(remediation_id,organization_id,ticket_key,title,finding_id,asset_id,priority,status,
                        owner,recommended_fix,risk_reduction_inr,planned_due_at,forecast_due_at,estimated_effort_hours,
                        remaining_effort_hours,capability_status,metadata) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                        %s + INTERVAL '14 days',%s + INTERVAL '18 days',%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                       (UUID(row[0]), organization_id, *row[1:7], Jsonb({"name": "Demo Security Team", "team": "Cyber Defence"}),
                        row[7], row[8], now, now, row[9], row[10], row[11], Jsonb({"data_origin": "DEMO"})))
        for row in reports:
            db.execute("""INSERT INTO generated_reports(report_id,organization_id,report_type,name,format,status,content)
                        VALUES (%s,%s,%s,%s,'JSON','READY',%s) ON CONFLICT DO NOTHING""",
                       (UUID(row[0]), organization_id, row[1], row[2], Jsonb(row[3])))
    return {"PROJECTS": len(projects), "POLICIES": len(policies), "INTEGRATIONS": len(integrations),
            "REPOSITORIES": len(repositories), "SCA": len(sca), "REMEDIATION": len(remediation), "REPORTS": len(reports)}


def refresh_demo_sources(organization_id: UUID = DEMO_ORGANIZATION_ID) -> dict:
    result = {"ASSETS": upsert_assets(load_json("assets.json"), data_origin="DEMO", organization_id=organization_id)}
    for source_type, filename in SOURCE_FILES.items():
        result[source_type] = upsert_findings(load_json(filename), data_origin="DEMO", organization_id=organization_id)
    covered_assets = {row["asset_id"] for row in load_json("vulnerabilities.json")}
    baseline_findings = [
        {"finding_id": f"VS-DEMO-{asset['asset_id']}", "source_type": "VULNERABILITY_SCANNER",
         "source_name": "Demo Continuous Scanner", "asset_id": asset["asset_id"], "finding_type": "CONFIGURATION",
         "title": f"Security hardening opportunity on {asset['name']}", "cvss": 5.5 + asset["criticality"] * 0.5,
         "severity": "HIGH" if asset["criticality"] >= 4 else "MEDIUM", "patch_available": True,
         "patch_age_days": 14, "exploited_in_wild": False, "confidence": 0.82,
         "first_seen": "2026-08-15", "status": "OPEN"}
        for asset in load_json("assets.json") if asset["asset_id"] not in covered_assets
    ]
    result["VULNERABILITY_SCANNER"] += upsert_findings(
        baseline_findings, data_origin="DEMO", organization_id=organization_id
    )
    result["CONTROL_CATALOG"] = upsert_control_catalog(
        load_json("control_catalog.json"),
        source_name="bundled-demo-fixture",
        observed_at=datetime.now().astimezone(),
        data_origin="DEMO",
        organization_id=organization_id,
    )
    result.update(seed_demo_platform_data(organization_id))
    return result


def fetch_findings(
    source_type: str | None = None,
    organization_id: UUID = DEFAULT_ORGANIZATION_ID,
) -> list[dict]:
    query = "SELECT payload FROM findings"
    parameters = ()
    conditions = ["organization_id = %s"]
    parameters = [organization_id]
    if source_type:
        conditions.append("source_type = %s")
        parameters.append(source_type)
    query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY first_seen DESC NULLS LAST, finding_id"
    with get_connection() as connection:
        rows = connection.execute(query, parameters).fetchall()
    return [row["payload"] for row in rows]


def ingestion_status(organization_id: UUID = DEFAULT_ORGANIZATION_ID) -> list[dict]:
    from backend.data_access import demo_mode_enabled

    origin = "DEMO" if demo_mode_enabled(organization_id) else "LIVE"
    with get_connection() as connection:
        rows = connection.execute(
            f"""
            SELECT source_type, COUNT(*) AS count, MAX(ingested_at) AS last_ingested_at
            FROM findings WHERE data_origin=%s AND organization_id=%s
            GROUP BY source_type ORDER BY source_type
            """, (origin, organization_id)
        ).fetchall()
    return rows
