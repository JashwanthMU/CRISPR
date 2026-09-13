"""Add immutable lineage fields for canonical risk snapshots."""

from alembic import op

revision = "0002_canonical_risk_snapshots"
down_revision = "0001_platform_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE risk_snapshots ADD COLUMN IF NOT EXISTS input_hash VARCHAR(64);
    ALTER TABLE risk_snapshots ADD COLUMN IF NOT EXISTS asset_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE risk_snapshots ADD COLUMN IF NOT EXISTS finding_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE risk_snapshots ADD COLUMN IF NOT EXISTS data_origin VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN';
    ALTER TABLE risk_snapshots ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
    ALTER TABLE risk_snapshots ADD COLUMN IF NOT EXISTS source_lineage JSONB NOT NULL DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_risk_snapshots_org_calculated
      ON risk_snapshots(organization_id,calculated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_risk_snapshots_input_hash
      ON risk_snapshots(organization_id,input_hash);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_risk_cases_org_asset
      ON risk_cases(organization_id,asset_id);
    """)


def downgrade() -> None:
    op.execute("""
    DROP INDEX IF EXISTS uq_risk_cases_org_asset;
    DROP INDEX IF EXISTS idx_risk_snapshots_input_hash;
    DROP INDEX IF EXISTS idx_risk_snapshots_org_calculated;
    ALTER TABLE risk_snapshots DROP COLUMN IF EXISTS source_lineage;
    ALTER TABLE risk_snapshots DROP COLUMN IF EXISTS requested_by;
    ALTER TABLE risk_snapshots DROP COLUMN IF EXISTS data_origin;
    ALTER TABLE risk_snapshots DROP COLUMN IF EXISTS finding_count;
    ALTER TABLE risk_snapshots DROP COLUMN IF EXISTS asset_count;
    ALTER TABLE risk_snapshots DROP COLUMN IF EXISTS input_hash;
    """)
