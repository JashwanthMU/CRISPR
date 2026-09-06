"""Add tenant-level LIVE/DEMO modes and an isolated demo organization."""

from alembic import op

revision = "0007_organization_data_modes"
down_revision = "0006_enterprise_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE organizations ADD COLUMN data_mode VARCHAR(8) NOT NULL DEFAULT 'LIVE';
    ALTER TABLE organizations ADD CONSTRAINT ck_organizations_data_mode
      CHECK(data_mode IN ('LIVE','DEMO'));
    INSERT INTO organizations(organization_id,name,slug,data_mode)
      VALUES ('00000000-0000-0000-0000-000000000002','CRISPR Demo','crispr-demo','DEMO')
      ON CONFLICT(organization_id) DO UPDATE SET data_mode='DEMO';
    INSERT INTO organization_members(organization_id,user_id,role)
      SELECT '00000000-0000-0000-0000-000000000002',user_id,role
      FROM users WHERE role='SECURITY' ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("""
    DELETE FROM organizations WHERE organization_id='00000000-0000-0000-0000-000000000002';
    ALTER TABLE organizations DROP CONSTRAINT IF EXISTS ck_organizations_data_mode;
    ALTER TABLE organizations DROP COLUMN IF EXISTS data_mode;
    """)
