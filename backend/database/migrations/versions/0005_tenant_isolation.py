"""Make externally supplied identifiers tenant-scoped.

External asset/finding/control IDs remain stable API identifiers. Internal UUIDs
become the physical primary keys, while composite constraints and foreign keys
prevent records from crossing organization boundaries.
"""

from alembic import op

revision = "0005_tenant_isolation"
down_revision = "0004_incident_frequency_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    ALTER TABLE findings DROP CONSTRAINT IF EXISTS fk_findings_asset;
    ALTER TABLE control_postures DROP CONSTRAINT IF EXISTS control_postures_asset_id_fkey;
    ALTER TABLE incident_frequency_assessments
      DROP CONSTRAINT IF EXISTS incident_frequency_assessments_finding_id_fkey;

    ALTER TABLE assets ADD COLUMN record_id UUID NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE findings ADD COLUMN record_id UUID NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE control_postures ADD COLUMN record_id UUID NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE control_catalog ADD COLUMN record_id UUID NOT NULL DEFAULT gen_random_uuid();

    ALTER TABLE assets DROP CONSTRAINT assets_pkey;
    ALTER TABLE findings DROP CONSTRAINT findings_pkey;
    ALTER TABLE control_postures DROP CONSTRAINT control_postures_pkey;
    ALTER TABLE control_catalog DROP CONSTRAINT control_catalog_pkey;

    ALTER TABLE assets ADD CONSTRAINT assets_pkey PRIMARY KEY(record_id);
    ALTER TABLE findings ADD CONSTRAINT findings_pkey PRIMARY KEY(record_id);
    ALTER TABLE control_postures ADD CONSTRAINT control_postures_pkey PRIMARY KEY(record_id);
    ALTER TABLE control_catalog ADD CONSTRAINT control_catalog_pkey PRIMARY KEY(record_id);

    DROP INDEX IF EXISTS uq_assets_org_asset;
    ALTER TABLE assets ADD CONSTRAINT uq_assets_org_asset UNIQUE(organization_id,asset_id);
    ALTER TABLE findings ADD CONSTRAINT uq_findings_org_finding UNIQUE(organization_id,finding_id);
    ALTER TABLE control_postures ADD CONSTRAINT uq_control_postures_org_asset UNIQUE(organization_id,asset_id);
    ALTER TABLE control_catalog ADD CONSTRAINT uq_control_catalog_org_control UNIQUE(organization_id,control_id);

    ALTER TABLE findings ADD CONSTRAINT fk_findings_org_asset
      FOREIGN KEY(organization_id,asset_id)
      REFERENCES assets(organization_id,asset_id) ON DELETE CASCADE;
    ALTER TABLE control_postures ADD CONSTRAINT fk_control_postures_org_asset
      FOREIGN KEY(organization_id,asset_id)
      REFERENCES assets(organization_id,asset_id) ON DELETE CASCADE;
    ALTER TABLE incident_frequency_assessments ADD CONSTRAINT fk_frequency_org_finding
      FOREIGN KEY(organization_id,finding_id)
      REFERENCES findings(organization_id,finding_id) ON DELETE CASCADE;

    ALTER TABLE bug_bounty_reports ADD COLUMN organization_id UUID;
    UPDATE bug_bounty_reports r SET organization_id=u.organization_id
      FROM users u WHERE r.reporter_user_id=u.user_id AND r.organization_id IS NULL;
    UPDATE bug_bounty_reports SET organization_id='00000000-0000-0000-0000-000000000001'
      WHERE organization_id IS NULL;
    ALTER TABLE bug_bounty_reports ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE bug_bounty_reports ADD CONSTRAINT fk_bug_bounty_organization
      FOREIGN KEY(organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE;

    CREATE INDEX idx_assets_org ON assets(organization_id);
    CREATE INDEX idx_findings_org_asset ON findings(organization_id,asset_id);
    CREATE INDEX idx_bug_bounty_org_created ON bug_bounty_reports(organization_id,created_at DESC);
    """)


def downgrade() -> None:
    op.execute("""
    ALTER TABLE bug_bounty_reports DROP CONSTRAINT IF EXISTS fk_bug_bounty_organization;
    DROP INDEX IF EXISTS idx_bug_bounty_org_created;
    ALTER TABLE bug_bounty_reports DROP COLUMN IF EXISTS organization_id;

    ALTER TABLE incident_frequency_assessments DROP CONSTRAINT IF EXISTS fk_frequency_org_finding;
    ALTER TABLE control_postures DROP CONSTRAINT IF EXISTS fk_control_postures_org_asset;
    ALTER TABLE findings DROP CONSTRAINT IF EXISTS fk_findings_org_asset;
    ALTER TABLE assets DROP CONSTRAINT IF EXISTS uq_assets_org_asset;
    ALTER TABLE findings DROP CONSTRAINT IF EXISTS uq_findings_org_finding;
    ALTER TABLE control_postures DROP CONSTRAINT IF EXISTS uq_control_postures_org_asset;
    ALTER TABLE control_catalog DROP CONSTRAINT IF EXISTS uq_control_catalog_org_control;

    ALTER TABLE assets DROP CONSTRAINT assets_pkey;
    ALTER TABLE findings DROP CONSTRAINT findings_pkey;
    ALTER TABLE control_postures DROP CONSTRAINT control_postures_pkey;
    ALTER TABLE control_catalog DROP CONSTRAINT control_catalog_pkey;
    ALTER TABLE assets ADD CONSTRAINT assets_pkey PRIMARY KEY(asset_id);
    ALTER TABLE findings ADD CONSTRAINT findings_pkey PRIMARY KEY(finding_id);
    ALTER TABLE control_postures ADD CONSTRAINT control_postures_pkey PRIMARY KEY(asset_id);
    ALTER TABLE control_catalog ADD CONSTRAINT control_catalog_pkey PRIMARY KEY(control_id);
    ALTER TABLE findings ADD CONSTRAINT fk_findings_asset FOREIGN KEY(asset_id)
      REFERENCES assets(asset_id) ON DELETE CASCADE;
    ALTER TABLE control_postures ADD CONSTRAINT control_postures_asset_id_fkey FOREIGN KEY(asset_id)
      REFERENCES assets(asset_id);
    ALTER TABLE incident_frequency_assessments
      ADD CONSTRAINT incident_frequency_assessments_finding_id_fkey FOREIGN KEY(finding_id)
      REFERENCES findings(finding_id) ON DELETE CASCADE;
    ALTER TABLE assets DROP COLUMN record_id;
    ALTER TABLE findings DROP COLUMN record_id;
    ALTER TABLE control_postures DROP COLUMN record_id;
    ALTER TABLE control_catalog DROP COLUMN record_id;
    """)
