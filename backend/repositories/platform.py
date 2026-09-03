"""Tenant-scoped persistence for platform resources and background jobs."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from psycopg.types.json import Jsonb

from backend.database.connection import get_connection


def list_projects(org_id: UUID, limit: int, offset: int) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT project_id AS id,name,description,environment,version,created_at,updated_at
               FROM projects WHERE organization_id=%s ORDER BY name LIMIT %s OFFSET %s""",
            (org_id, limit, offset),
        ).fetchall()


def create_project(org_id: UUID, body: dict) -> dict:
    with get_connection() as db:
        return db.execute(
            """INSERT INTO projects(project_id,organization_id,name,description,environment)
               VALUES (%s,%s,%s,%s,%s)
               RETURNING project_id AS id,name,description,environment,version,created_at,updated_at""",
            (uuid4(), org_id, body["name"], body.get("description"), body["environment"]),
        ).fetchone()


def list_policies(org_id: UUID, limit: int, offset: int) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT policy_id AS id,name,description,framework,framework_ref,severity,enabled,
                      auto_remediate,version,created_at,updated_at
               FROM policies WHERE organization_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s""",
            (org_id, limit, offset),
        ).fetchall()


def create_policy(org_id: UUID, user_id: UUID, body: dict) -> dict:
    with get_connection() as db:
        return db.execute(
            """INSERT INTO policies(policy_id,organization_id,name,description,framework,framework_ref,
                      severity,auto_remediate,created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING policy_id AS id,name,description,framework,framework_ref,severity,enabled,
                         auto_remediate,version,created_at,updated_at""",
            (
                uuid4(), org_id, body["name"], body["description"], body.get("framework"),
                body.get("framework_ref"), body["severity"], body["auto_remediate"], user_id,
            ),
        ).fetchone()


def toggle_policy(org_id: UUID, policy_id: UUID, expected_version: int) -> dict | None:
    with get_connection() as db:
        return db.execute(
            """UPDATE policies SET enabled=NOT enabled,version=version+1,updated_at=NOW()
               WHERE organization_id=%s AND policy_id=%s AND version=%s
               RETURNING policy_id AS id,name,description,framework,framework_ref,severity,enabled,
                         auto_remediate,version,created_at,updated_at""",
            (org_id, policy_id, expected_version),
        ).fetchone()


def list_remediation(org_id: UUID, limit: int, offset: int) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT remediation_id AS id,title,finding_id,asset_id,priority,status,owner,
                      recommended_fix AS "recommendedFix",risk_reduction_inr AS "riskReductionInr",
                      metadata,version,created_at,updated_at
               FROM remediation_items WHERE organization_id=%s
               ORDER BY created_at DESC LIMIT %s OFFSET %s""",
            (org_id, limit, offset),
        ).fetchall()


def create_remediation(org_id: UUID, user_id: UUID, body: dict) -> dict:
    item_id = uuid4()
    with get_connection() as db:
        row = db.execute(
            """INSERT INTO remediation_items(remediation_id,organization_id,title,finding_id,asset_id,
                      priority,status,owner,recommended_fix,risk_reduction_inr,metadata,created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING remediation_id AS id,title,finding_id,asset_id,priority,status,owner,
                         recommended_fix AS "recommendedFix",risk_reduction_inr AS "riskReductionInr",
                         metadata,version,created_at,updated_at""",
            (
                item_id, org_id, body["title"], body.get("finding_id"), body.get("asset_id"),
                body["priority"], body.get("status", "NOT_STARTED"), Jsonb(body.get("owner")),
                body.get("recommended_fix"), body.get("risk_reduction_inr"),
                Jsonb(body.get("metadata", {})), user_id,
            ),
        ).fetchone()
        return row


def update_remediation(
    org_id: UUID, item_id: UUID, expected_version: int, status: str | None = None,
    owner: dict | None = None,
) -> tuple[dict | None, dict | None]:
    with get_connection() as db:
        previous = db.execute(
            "SELECT status,owner,version FROM remediation_items WHERE organization_id=%s AND remediation_id=%s",
            (org_id, item_id),
        ).fetchone()
        if not previous or previous["version"] != expected_version:
            return previous, None
        current = db.execute(
            """UPDATE remediation_items SET status=COALESCE(%s,status),owner=COALESCE(%s,owner),
                      version=version+1,updated_at=NOW()
               WHERE organization_id=%s AND remediation_id=%s AND version=%s
               RETURNING remediation_id AS id,title,finding_id,asset_id,priority,status,owner,
                         recommended_fix AS "recommendedFix",risk_reduction_inr AS "riskReductionInr",
                         metadata,version,created_at,updated_at""",
            (status, Jsonb(owner) if owner else None, org_id, item_id, expected_version),
        ).fetchone()
        return previous, current


def get_settings(org_id: UUID) -> dict:
    with get_connection() as db:
        row = db.execute(
            "SELECT settings,version,updated_at FROM organization_settings WHERE organization_id=%s",
            (org_id,),
        ).fetchone()
    return row or {"settings": {}, "version": 0, "updated_at": None}


def update_settings(org_id: UUID, settings: dict, expected_version: int) -> dict | None:
    with get_connection() as db:
        if expected_version == 0:
            return db.execute(
                """INSERT INTO organization_settings(organization_id,settings,version)
                   VALUES (%s,%s,1) ON CONFLICT DO NOTHING
                   RETURNING settings,version,updated_at""",
                (org_id, Jsonb(settings)),
            ).fetchone()
        return db.execute(
            """UPDATE organization_settings SET settings=settings || %s,version=version+1,updated_at=NOW()
               WHERE organization_id=%s AND version=%s RETURNING settings,version,updated_at""",
            (Jsonb(settings), org_id, expected_version),
        ).fetchone()


def list_integrations(org_id: UUID) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT integration_id AS id,provider,name,config,enabled,status,version,last_verified_at,
                      last_sync_at,last_error,created_at,updated_at
               FROM integrations WHERE organization_id=%s ORDER BY name""",
            (org_id,),
        ).fetchall()


def get_integration(org_id: UUID, integration_id: UUID, include_secret: bool = False) -> dict | None:
    secret = ",encrypted_credentials" if include_secret else ""
    with get_connection() as db:
        return db.execute(
            f"""SELECT integration_id AS id,organization_id,provider,name,config,enabled,status,cursor,
                       version,last_verified_at,last_sync_at,last_error{secret}
                FROM integrations WHERE organization_id=%s AND integration_id=%s""",
            (org_id, integration_id),
        ).fetchone()


def create_integration(org_id: UUID, provider: str, name: str, config: dict, encrypted: bytes) -> dict:
    integration_id = uuid4()
    with get_connection() as db:
        return db.execute(
            """INSERT INTO integrations(integration_id,organization_id,provider,name,config,encrypted_credentials,credential_key_id)
               VALUES (%s,%s,%s,%s,%s,%s,'v1')
               RETURNING integration_id AS id,provider,name,config,enabled,status,version,created_at,updated_at""",
            (integration_id, org_id, provider, name, Jsonb(config), encrypted),
        ).fetchone()


def delete_integration_credentials(org_id: UUID, integration_id: UUID) -> dict | None:
    with get_connection() as db:
        return db.execute(
            """UPDATE integrations SET encrypted_credentials=NULL,credential_key_id=NULL,enabled=FALSE,
                      status='disabled',cursor=NULL,version=version+1,updated_at=NOW()
               WHERE organization_id=%s AND integration_id=%s
               RETURNING integration_id AS id,provider,name,enabled,status,version,updated_at""",
            (org_id, integration_id),
        ).fetchone()


def set_integration_state(org_id: UUID, integration_id: UUID, **updates) -> dict | None:
    allowed = {"enabled", "status", "last_error", "last_verified_at", "last_sync_at", "cursor"}
    selected = {key: value for key, value in updates.items() if key in allowed}
    if not selected:
        return get_integration(org_id, integration_id)
    assignments = ",".join(f"{key}=%s" for key in selected) + ",version=version+1,updated_at=NOW()"
    values = [Jsonb(value) if key == "cursor" else value for key, value in selected.items()]
    with get_connection() as db:
        return db.execute(
            f"""UPDATE integrations SET {assignments} WHERE organization_id=%s AND integration_id=%s
                RETURNING integration_id AS id,provider,name,config,enabled,status,version,last_verified_at,last_sync_at,last_error""",
            (*values, org_id, integration_id),
        ).fetchone()


def enqueue_sync(org_id: UUID, integration_id: UUID, user_id: UUID | None) -> dict:
    job_id, run_id = uuid4(), uuid4()
    with get_connection() as db:
        db.execute(
            "INSERT INTO jobs(job_id,organization_id,job_type,payload) VALUES (%s,%s,'integration.sync',%s)",
            (job_id, org_id, Jsonb({"integration_id": str(integration_id), "sync_run_id": str(run_id)})),
        )
        return db.execute(
            """INSERT INTO sync_runs(sync_run_id,organization_id,integration_id,job_id,requested_by)
               VALUES (%s,%s,%s,%s,%s)
               RETURNING sync_run_id AS id,job_id,status,created_at""",
            (run_id, org_id, integration_id, job_id, user_id),
        ).fetchone()


def list_sync_runs(org_id: UUID, integration_id: UUID, limit: int = 50) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT sync_run_id AS id,job_id,status,cursor_before,cursor_after,items_received,
                      items_written,error,started_at,completed_at,created_at
               FROM sync_runs WHERE organization_id=%s AND integration_id=%s
               ORDER BY created_at DESC LIMIT %s""",
            (org_id, integration_id, limit),
        ).fetchall()


def list_repositories(org_id: UUID, limit: int, offset: int) -> list[dict]:
    with get_connection() as db:
        return db.execute(
            """SELECT repository_id AS id,external_id,full_name AS name,private,default_branch AS "defaultBranch",
                      html_url,archived,pushed_at AS "lastScan",raw
               FROM repositories WHERE organization_id=%s ORDER BY full_name LIMIT %s OFFSET %s""",
            (org_id, limit, offset),
        ).fetchall()


def list_sca(org_id: UUID, repository: str | None, limit: int, offset: int) -> list[dict]:
    parameters: list = [org_id]
    condition = ""
    if repository:
        condition = " AND r.full_name=%s"
        parameters.append(repository)
    parameters.extend([limit, offset])
    with get_connection() as db:
        return db.execute(
            f"""SELECT s.sca_finding_id AS id,r.full_name AS repository,s.external_id,s.state,s.severity,s.cve,
                        s.package_name AS component,s.manifest_path,s.vulnerable_range,
                        s.patched_version AS "fixedVersion",s.html_url,s.observed_at
                 FROM sca_findings s JOIN repositories r ON r.repository_id=s.repository_id
                 WHERE s.organization_id=%s{condition} ORDER BY s.observed_at DESC LIMIT %s OFFSET %s""",
            tuple(parameters),
        ).fetchall()
