"""Persist model validation and drift evidence."""

from alembic import op

revision = "0003_ml_governance"
down_revision = "0002_canonical_risk_snapshots"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS model_validation_runs (
      validation_id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      job_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL,
      model_version VARCHAR(120) NOT NULL,
      validation_type VARCHAR(80) NOT NULL,
      status VARCHAR(32) NOT NULL,
      evidence JSONB NOT NULL,
      requested_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_model_validation_org_created
      ON model_validation_runs(organization_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS model_drift_reports (
      drift_report_id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      job_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL,
      model_version VARCHAR(120) NOT NULL,
      status VARCHAR(32) NOT NULL,
      evidence JSONB NOT NULL,
      requested_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_model_drift_org_created
      ON model_drift_reports(organization_id,created_at DESC);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS model_drift_reports;
    DROP TABLE IF EXISTS model_validation_runs;
    """)
