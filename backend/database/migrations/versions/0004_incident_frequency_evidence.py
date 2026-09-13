"""Add versioned annual incident-frequency evidence for financial risk."""

from alembic import op

revision = "0004_incident_frequency_evidence"
down_revision = "0003_ml_governance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE incident_frequency_assessments (
      assessment_id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      finding_id VARCHAR(64) NOT NULL REFERENCES findings(finding_id) ON DELETE CASCADE,
      annual_incident_probability DOUBLE PRECISION NOT NULL
        CHECK (annual_incident_probability >= 0 AND annual_incident_probability <= 1),
      methodology VARCHAR(160) NOT NULL,
      evidence_reference TEXT NOT NULL,
      source_name VARCHAR(120) NOT NULL,
      confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
      observed_at TIMESTAMPTZ NOT NULL,
      valid_until TIMESTAMPTZ NOT NULL,
      created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (valid_until > observed_at)
    );
    CREATE INDEX idx_frequency_org_finding_observed
      ON incident_frequency_assessments(organization_id,finding_id,observed_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS incident_frequency_assessments;")
