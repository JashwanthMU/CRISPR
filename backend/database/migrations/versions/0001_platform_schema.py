"""Adopt the prototype schema and add durable platform tables."""

from alembic import op

revision = "0001_platform_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
      organization_id UUID PRIMARY KEY, name VARCHAR(160) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    INSERT INTO organizations VALUES
      ('00000000-0000-0000-0000-000000000001','Default Organization','default',NOW())
      ON CONFLICT (organization_id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS users (
      user_id UUID PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role VARCHAR(16) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;
    UPDATE users SET organization_id='00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    ALTER TABLE users ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY(organization_id)
        REFERENCES organizations(organization_id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS organization_members (
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, role VARCHAR(32) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(organization_id,user_id));
    INSERT INTO organization_members(organization_id,user_id,role)
      SELECT organization_id,user_id,role FROM users ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS projects (
      project_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL, description TEXT, environment VARCHAR(32) NOT NULL DEFAULT 'production',
      version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(organization_id,name));

    CREATE TABLE IF NOT EXISTS bug_bounty_reports (
      report_id UUID PRIMARY KEY, reporter_name VARCHAR(120) NOT NULL, reporter_email VARCHAR(255) NOT NULL,
      title VARCHAR(240) NOT NULL, asset_id VARCHAR(32) NOT NULL, weakness VARCHAR(120) NOT NULL,
      severity VARCHAR(16) NOT NULL, description TEXT NOT NULL, impact TEXT NOT NULL,
      reproduction_steps TEXT NOT NULL, remediation TEXT, cve VARCHAR(32), status VARCHAR(16) NOT NULL DEFAULT 'SUBMITTED',
      triage_notes TEXT, reviewed_by VARCHAR(120), reporter_user_id UUID REFERENCES users(user_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE bug_bounty_reports ADD COLUMN IF NOT EXISTS reporter_user_id UUID REFERENCES users(user_id);

    CREATE TABLE IF NOT EXISTS assets (
      asset_id VARCHAR(32) PRIMARY KEY, payload JSONB NOT NULL, data_origin VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS organization_id UUID;
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS project_id UUID;
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS data_origin VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN';
    UPDATE assets SET organization_id='00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    ALTER TABLE assets ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    ALTER TABLE assets ALTER COLUMN organization_id SET NOT NULL;
    DO $$ BEGIN
      ALTER TABLE assets ADD CONSTRAINT fk_assets_organization FOREIGN KEY(organization_id)
        REFERENCES organizations(organization_id) ON DELETE CASCADE;
      ALTER TABLE assets ADD CONSTRAINT fk_assets_project FOREIGN KEY(project_id)
        REFERENCES projects(project_id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_assets_org_asset ON assets(organization_id,asset_id);

    CREATE TABLE IF NOT EXISTS findings (
      finding_id VARCHAR(64) PRIMARY KEY, source_type VARCHAR(40) NOT NULL, source_name VARCHAR(120) NOT NULL,
      asset_id VARCHAR(32) NOT NULL, payload JSONB NOT NULL, data_origin VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
      first_seen DATE, ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS organization_id UUID;
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS project_id UUID;
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS severity VARCHAR(16);
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS cve VARCHAR(32);
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS status VARCHAR(24);
    ALTER TABLE findings ADD COLUMN IF NOT EXISTS data_origin VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN';
    UPDATE findings SET organization_id='00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    UPDATE findings SET severity=payload->>'severity',cve=payload->>'cve',status=payload->>'status';
    ALTER TABLE findings ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    ALTER TABLE findings ALTER COLUMN organization_id SET NOT NULL;
    DO $$ BEGIN
      ALTER TABLE findings ADD CONSTRAINT fk_findings_organization FOREIGN KEY(organization_id)
        REFERENCES organizations(organization_id) ON DELETE CASCADE;
      ALTER TABLE findings ADD CONSTRAINT fk_findings_project FOREIGN KEY(project_id)
        REFERENCES projects(project_id) ON DELETE SET NULL;
      ALTER TABLE findings ADD CONSTRAINT fk_findings_asset FOREIGN KEY(asset_id)
        REFERENCES assets(asset_id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS idx_findings_org ON findings(organization_id);
    CREATE INDEX IF NOT EXISTS idx_findings_source_type ON findings(source_type);
    CREATE INDEX IF NOT EXISTS idx_findings_asset_id ON findings(asset_id);
    CREATE INDEX IF NOT EXISTS idx_findings_cve ON findings(cve);

    CREATE TABLE IF NOT EXISTS control_postures (
      asset_id VARCHAR(32) PRIMARY KEY REFERENCES assets(asset_id), payload JSONB NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL, source_name VARCHAR(120) NOT NULL,
      data_origin VARCHAR(16) NOT NULL DEFAULT 'LIVE', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE control_postures ADD COLUMN IF NOT EXISTS organization_id UUID;
    UPDATE control_postures SET organization_id='00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    ALTER TABLE control_postures ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    ALTER TABLE control_postures ALTER COLUMN organization_id SET NOT NULL;
    CREATE TABLE IF NOT EXISTS control_catalog (
      control_id VARCHAR(64) PRIMARY KEY, payload JSONB NOT NULL, source_name VARCHAR(120) NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL, data_origin VARCHAR(16) NOT NULL DEFAULT 'LIVE',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE control_catalog ADD COLUMN IF NOT EXISTS organization_id UUID;
    UPDATE control_catalog SET organization_id='00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    ALTER TABLE control_catalog ALTER COLUMN organization_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
    ALTER TABLE control_catalog ALTER COLUMN organization_id SET NOT NULL;

    CREATE TABLE IF NOT EXISTS integrations (
      integration_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      provider VARCHAR(48) NOT NULL, name VARCHAR(160) NOT NULL, config JSONB NOT NULL DEFAULT '{}'::jsonb,
      encrypted_credentials BYTEA, credential_key_id VARCHAR(80), enabled BOOLEAN NOT NULL DEFAULT TRUE,
      status VARCHAR(24) NOT NULL DEFAULT 'pending', cursor JSONB, version INTEGER NOT NULL DEFAULT 1,
      last_verified_at TIMESTAMPTZ, last_sync_at TIMESTAMPTZ, last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id,provider,name));
    CREATE TABLE IF NOT EXISTS jobs (
      job_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      job_type VARCHAR(64) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'QUEUED', payload JSONB NOT NULL,
      result JSONB, error TEXT, attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 3,
      available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), locked_at TIMESTAMPTZ, locked_by VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ);
    CREATE INDEX IF NOT EXISTS idx_jobs_claim ON jobs(status,available_at,created_at);
    CREATE TABLE IF NOT EXISTS sync_runs (
      sync_run_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      integration_id UUID NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
      job_id UUID REFERENCES jobs(job_id), status VARCHAR(24) NOT NULL DEFAULT 'QUEUED', cursor_before JSONB,
      cursor_after JSONB, items_received INTEGER NOT NULL DEFAULT 0, items_written INTEGER NOT NULL DEFAULT 0,
      error TEXT, requested_by UUID REFERENCES users(user_id), started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

    CREATE TABLE IF NOT EXISTS repositories (
      repository_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      integration_id UUID REFERENCES integrations(integration_id) ON DELETE SET NULL, external_id VARCHAR(120) NOT NULL,
      full_name VARCHAR(300) NOT NULL, private BOOLEAN NOT NULL, default_branch VARCHAR(160), html_url TEXT,
      archived BOOLEAN NOT NULL DEFAULT FALSE, pushed_at TIMESTAMPTZ, raw JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(organization_id,external_id));
    CREATE TABLE IF NOT EXISTS sca_findings (
      sca_finding_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      repository_id UUID NOT NULL REFERENCES repositories(repository_id) ON DELETE CASCADE, external_id VARCHAR(120) NOT NULL,
      state VARCHAR(32) NOT NULL, severity VARCHAR(16), cve VARCHAR(32), package_name VARCHAR(300), manifest_path TEXT,
      vulnerable_range TEXT, patched_version VARCHAR(160), html_url TEXT, raw JSONB NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(repository_id,external_id));

    CREATE TABLE IF NOT EXISTS policies (
      policy_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL, description TEXT NOT NULL, framework VARCHAR(80), framework_ref VARCHAR(80),
      severity VARCHAR(16) NOT NULL, enabled BOOLEAN NOT NULL DEFAULT TRUE, auto_remediate BOOLEAN NOT NULL DEFAULT FALSE,
      version INTEGER NOT NULL DEFAULT 1, created_by UUID REFERENCES users(user_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS policy_evaluations (
      evaluation_id UUID PRIMARY KEY, policy_id UUID NOT NULL REFERENCES policies(policy_id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      status VARCHAR(24) NOT NULL, evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), summary JSONB NOT NULL DEFAULT '{}'::jsonb);
    CREATE TABLE IF NOT EXISTS policy_violations (
      violation_id UUID PRIMARY KEY, evaluation_id UUID NOT NULL REFERENCES policy_evaluations(evaluation_id) ON DELETE CASCADE,
      asset_id VARCHAR(32), finding_id VARCHAR(64), details JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(24) NOT NULL DEFAULT 'OPEN', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS remediation_items (
      remediation_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      title VARCHAR(240) NOT NULL, finding_id VARCHAR(64), asset_id VARCHAR(32), priority VARCHAR(16) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED', owner JSONB, recommended_fix TEXT,
      risk_reduction_inr NUMERIC(18,2), metadata JSONB NOT NULL DEFAULT '{}'::jsonb, version INTEGER NOT NULL DEFAULT 1,
      created_by UUID REFERENCES users(user_id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS remediation_events (
      event_id UUID PRIMARY KEY, remediation_id UUID NOT NULL REFERENCES remediation_items(remediation_id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      event_type VARCHAR(48) NOT NULL, actor_id UUID REFERENCES users(user_id), previous JSONB, current JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS organization_settings (
      organization_id UUID PRIMARY KEY REFERENCES organizations(organization_id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb, version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS risk_cases (
      risk_case_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      asset_id VARCHAR(32) NOT NULL, finding_ids JSONB NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS risk_snapshots (
      snapshot_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      risk_case_id UUID REFERENCES risk_cases(risk_case_id) ON DELETE CASCADE, model_version VARCHAR(120) NOT NULL,
      input_version VARCHAR(120) NOT NULL, assumptions JSONB NOT NULL, result JSONB NOT NULL,
      calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS generated_reports (
      report_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      report_type VARCHAR(64) NOT NULL, name VARCHAR(240) NOT NULL, format VARCHAR(24) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'READY', content JSONB, generated_by UUID REFERENCES users(user_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS audit_events (
      audit_event_id UUID PRIMARY KEY, organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
      actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL, action VARCHAR(120) NOT NULL,
      resource_type VARCHAR(80) NOT NULL, resource_id VARCHAR(160), details JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address INET, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_events(organization_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS auth_sessions (
      session_id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS login_attempts (
      attempt_id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL, ip_address INET,
      succeeded BOOLEAN NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts(email,created_at DESC);
    """)


def downgrade() -> None:
    for table in (
        "login_attempts", "auth_sessions", "audit_events", "generated_reports", "risk_snapshots", "risk_cases",
        "organization_settings", "remediation_events", "remediation_items", "policy_violations",
        "policy_evaluations", "policies", "sca_findings", "repositories", "sync_runs", "jobs",
        "integrations", "projects", "organization_members",
    ):
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
