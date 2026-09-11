"""Remediation delivery risk and privacy-safe delivery issues.

Revision ID: 0008_remediation_delivery_risk
Revises: 0007_organization_data_modes
"""

from alembic import op

revision = "0008_remediation_delivery_risk"
down_revision = "0007_organization_data_modes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS ticket_key VARCHAR(64);
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS planned_due_at TIMESTAMPTZ;
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS forecast_due_at TIMESTAMPTZ;
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS estimated_effort_hours NUMERIC(10,2);
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS remaining_effort_hours NUMERIC(10,2);
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS capability_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN';
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS backup_owner JSONB;
    ALTER TABLE remediation_items ADD COLUMN IF NOT EXISTS realized_risk_reduction_inr NUMERIC(18,2) NOT NULL DEFAULT 0;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_remediation_ticket_key
      ON remediation_items(organization_id,ticket_key) WHERE ticket_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS remediation_delivery_issues (
      issue_id UUID PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      remediation_id UUID NOT NULL REFERENCES remediation_items(remediation_id) ON DELETE CASCADE,
      issue_type VARCHAR(40) NOT NULL,
      availability_impact VARCHAR(24) NOT NULL,
      expected_resolution_at TIMESTAMPTZ,
      reassignment_allowed BOOLEAN NOT NULL DEFAULT TRUE,
      note VARCHAR(500),
      status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
      reported_by UUID REFERENCES users(user_id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS ix_delivery_issues_tenant_ticket
      ON remediation_delivery_issues(organization_id,remediation_id,status);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS remediation_delivery_issues;
    DROP INDEX IF EXISTS ux_remediation_ticket_key;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS realized_risk_reduction_inr;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS backup_owner;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS capability_status;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS remaining_effort_hours;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS estimated_effort_hours;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS forecast_due_at;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS planned_due_at;
    ALTER TABLE remediation_items DROP COLUMN IF EXISTS ticket_key;
    """)
