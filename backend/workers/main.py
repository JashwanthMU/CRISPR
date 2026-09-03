"""Durable PostgreSQL worker for external connector synchronization."""

import os
import socket
import time
from datetime import datetime, timezone
from uuid import UUID, uuid4

from psycopg.types.json import Jsonb

from backend.connectors.github import GitHubConnector
from backend.database.connection import get_connection
from backend.repositories.platform import get_integration, set_integration_state
from backend.repositories.platform import enqueue_sync
from backend.security.secrets import decrypt_credentials

WORKER_ID = f"{socket.gethostname()}:{os.getpid()}"


def recover_abandoned_jobs() -> None:
    with get_connection() as db:
        db.execute(
            """UPDATE jobs SET status='RETRY',locked_at=NULL,locked_by=NULL,available_at=NOW(),
                      error=COALESCE(error || '; ','') || 'Recovered after worker interruption'
               WHERE status='RUNNING' AND locked_at < NOW() - INTERVAL '15 minutes'"""
        )


def schedule_due_syncs() -> int:
    with get_connection() as db:
        rows = db.execute(
            """SELECT i.organization_id,i.integration_id
               FROM integrations i
               WHERE i.enabled=TRUE AND i.encrypted_credentials IS NOT NULL
                 AND (i.last_sync_at IS NULL OR i.last_sync_at +
                      (COALESCE((i.config->>'sync_interval_minutes')::integer,60) * INTERVAL '1 minute') <= NOW())
                 AND NOT EXISTS (
                   SELECT 1 FROM jobs j WHERE j.organization_id=i.organization_id
                     AND j.job_type='integration.sync' AND j.status IN ('QUEUED','RETRY','RUNNING')
                     AND j.payload->>'integration_id'=i.integration_id::text)
               LIMIT 25"""
        ).fetchall()
    for row in rows:
        enqueue_sync(row["organization_id"], row["integration_id"], None)
    return len(rows)


def claim_job() -> dict | None:
    with get_connection() as db:
        return db.execute(
            """UPDATE jobs SET status='RUNNING',attempts=attempts+1,locked_at=NOW(),locked_by=%s,
                      started_at=COALESCE(started_at,NOW())
               WHERE job_id=(SELECT job_id FROM jobs WHERE status IN ('QUEUED','RETRY') AND available_at<=NOW()
                             ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
               RETURNING *""", (WORKER_ID,),
        ).fetchone()


def _upsert_repository(db, org_id: UUID, integration_id: UUID, item: dict) -> UUID:
    row = db.execute(
        """INSERT INTO repositories(repository_id,organization_id,integration_id,external_id,full_name,
                  private,default_branch,html_url,archived,pushed_at,raw)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           ON CONFLICT(organization_id,external_id) DO UPDATE SET full_name=EXCLUDED.full_name,
             private=EXCLUDED.private,default_branch=EXCLUDED.default_branch,html_url=EXCLUDED.html_url,
             archived=EXCLUDED.archived,pushed_at=EXCLUDED.pushed_at,raw=EXCLUDED.raw,updated_at=NOW()
           RETURNING repository_id""",
        (uuid4(), org_id, integration_id, str(item["id"]), item["full_name"], item["private"],
         item.get("default_branch"), item.get("html_url"), item.get("archived", False), item.get("pushed_at"), Jsonb(item)),
    ).fetchone()
    return row["repository_id"]


def _upsert_alert(db, org_id: UUID, repository_id: UUID, alert: dict) -> None:
    advisory, vulnerability = alert.get("security_advisory") or {}, alert.get("security_vulnerability") or {}
    package, identifiers = vulnerability.get("package") or {}, advisory.get("identifiers") or []
    cve = next((entry.get("value") for entry in identifiers if entry.get("type") == "CVE"), None)
    db.execute(
        """INSERT INTO sca_findings(sca_finding_id,organization_id,repository_id,external_id,state,severity,
                  cve,package_name,manifest_path,vulnerable_range,patched_version,html_url,raw)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           ON CONFLICT(repository_id,external_id) DO UPDATE SET state=EXCLUDED.state,severity=EXCLUDED.severity,
             cve=EXCLUDED.cve,package_name=EXCLUDED.package_name,manifest_path=EXCLUDED.manifest_path,
             vulnerable_range=EXCLUDED.vulnerable_range,patched_version=EXCLUDED.patched_version,
             html_url=EXCLUDED.html_url,raw=EXCLUDED.raw,observed_at=NOW()""",
        (uuid4(), org_id, repository_id, str(alert["number"]), alert.get("state", "open"), advisory.get("severity"),
         cve, package.get("name"), (alert.get("dependency") or {}).get("manifest_path"), vulnerability.get("vulnerable_version_range"),
         (vulnerability.get("first_patched_version") or {}).get("identifier"), alert.get("html_url"), Jsonb(alert)),
    )


def sync_github(job: dict) -> dict:
    payload, org_id = job["payload"], job["organization_id"]
    integration_id, run_id = UUID(payload["integration_id"]), UUID(payload["sync_run_id"])
    integration = get_integration(org_id, integration_id, include_secret=True)
    if not integration or not integration.get("encrypted_credentials"):
        raise RuntimeError("Integration credentials are missing")
    credentials = decrypt_credentials(integration["encrypted_credentials"])
    connector = GitHubConnector(credentials["token"], integration["config"].get("organization"))
    received = written = 0
    with get_connection() as db:
        db.execute("UPDATE sync_runs SET status='RUNNING',started_at=NOW(),cursor_before=%s WHERE sync_run_id=%s",
                   (Jsonb(integration.get("cursor")), run_id))
    cursor = integration.get("cursor")
    while True:
        page = connector.fetch_assets(cursor)
        received += len(page.items)
        with get_connection() as db:
            for repository in page.items:
                repository_id = _upsert_repository(db, org_id, integration_id, repository)
                written += 1
                alert_page = 1
                while True:
                    try:
                        alerts = connector.fetch_dependabot_alerts(repository["full_name"], alert_page)
                    except RuntimeError as error:
                        if "HTTP 403" in str(error) or "HTTP 404" in str(error):
                            break
                        raise
                    received += len(alerts.items)
                    for alert in alerts.items:
                        _upsert_alert(db, org_id, repository_id, alert)
                        written += 1
                    if not alerts.next_cursor:
                        break
                    alert_page = alerts.next_cursor["page"]
        cursor = page.next_cursor
        if not cursor:
            break
    with get_connection() as db:
        db.execute("""UPDATE sync_runs SET status='SUCCEEDED',items_received=%s,items_written=%s,cursor_after=%s,
                      completed_at=NOW() WHERE sync_run_id=%s""", (received, written, Jsonb(cursor), run_id))
    set_integration_state(org_id, integration_id, status="connected", last_sync_at=datetime.now(timezone.utc), last_error=None, cursor=None)
    return {"items_received": received, "items_written": written}


def process(job: dict) -> dict:
    if job["job_type"] == "integration.sync":
        return sync_github(job)
    if job["job_type"] == "risk.analysis":
        from backend.services.risk_pipeline import run_and_persist_analysis

        requested_by = job["payload"].get("requested_by")
        result = run_and_persist_analysis(
            job["organization_id"], UUID(requested_by) if requested_by else None
        )
        return {"snapshot_id": result["snapshot_id"], "summary": result["enterprise"]}
    if job["job_type"] == "report.generate":
        report_id, report_type = UUID(job["payload"]["report_id"]), job["payload"]["report_type"]
        with get_connection() as db:
            if report_type == "RISK_SUMMARY":
                row = db.execute(
                    """SELECT snapshot_id,model_version,input_version,assumptions,result,calculated_at
                       FROM risk_snapshots WHERE organization_id=%s ORDER BY calculated_at DESC LIMIT 1""",
                    (job["organization_id"],),
                ).fetchone()
                if not row:
                    raise RuntimeError("Run a risk analysis before generating a risk summary")
                content = row
            elif report_type == "FINDINGS_DIGEST":
                rows = db.execute(
                    """SELECT severity,status,COUNT(*) AS count FROM findings WHERE organization_id=%s
                       GROUP BY severity,status ORDER BY severity,status""", (job["organization_id"],),
                ).fetchall()
                content = {"groups": rows, "calculated_at": datetime.now(timezone.utc).isoformat()}
            else:
                raise RuntimeError(f"Unsupported report type: {report_type}")
            db.execute("UPDATE generated_reports SET status='READY',content=%s WHERE report_id=%s",
                       (Jsonb(content), report_id))
        return {"report_id": str(report_id), "status": "READY"}
    raise RuntimeError(f"Unsupported job type: {job['job_type']}")


def finish(job: dict, result: dict) -> None:
    with get_connection() as db:
        db.execute("UPDATE jobs SET status='SUCCEEDED',result=%s,completed_at=NOW() WHERE job_id=%s", (Jsonb(result), job["job_id"]))


def fail(job: dict, error: Exception) -> None:
    retry, delay = job["attempts"] < job["max_attempts"], min(300, 2 ** job["attempts"])
    with get_connection() as db:
        db.execute("""UPDATE jobs SET status=%s,error=%s,available_at=NOW()+(%s * INTERVAL '1 second'),
                      completed_at=CASE WHEN %s THEN NULL ELSE NOW() END WHERE job_id=%s""",
                   ("RETRY" if retry else "FAILED", str(error)[:4000], delay, retry, job["job_id"]))
        run_id = job["payload"].get("sync_run_id")
        if run_id:
            db.execute("UPDATE sync_runs SET status=%s,error=%s,completed_at=CASE WHEN %s THEN NULL ELSE NOW() END WHERE sync_run_id=%s",
                       ("RETRY" if retry else "FAILED", str(error)[:4000], retry, run_id))
            integration_id = job["payload"].get("integration_id")
            if integration_id and not retry:
                db.execute(
                    "UPDATE integrations SET status='error',last_error=%s,updated_at=NOW() WHERE integration_id=%s",
                    (str(error)[:4000], integration_id),
                )
        report_id = job["payload"].get("report_id")
        if report_id and not retry:
            db.execute("UPDATE generated_reports SET status='FAILED',content=%s WHERE report_id=%s",
                       (Jsonb({"error": str(error)[:4000]}), report_id))


def run_forever() -> None:
    recover_abandoned_jobs()
    next_schedule = 0.0
    while True:
        if time.monotonic() >= next_schedule:
            schedule_due_syncs()
            next_schedule = time.monotonic() + 30
        job = claim_job()
        if not job:
            time.sleep(2)
            continue
        try:
            finish(job, process(job))
        except Exception as error:
            fail(job, error)


if __name__ == "__main__":
    run_forever()
