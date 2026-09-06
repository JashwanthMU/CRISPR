"""Add provider-neutral enterprise evidence and business-event records."""

from alembic import op

revision = "0006_enterprise_evidence"
down_revision = "0005_tenant_isolation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE telemetry_events (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      source_name TEXT NOT NULL,
      external_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      asset_id TEXT,
      identity_id TEXT,
      severity TEXT,
      observed_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id,source_name,external_event_id)
    );
    CREATE INDEX idx_telemetry_org_time ON telemetry_events(organization_id,observed_at DESC);
    CREATE INDEX idx_telemetry_org_asset ON telemetry_events(organization_id,asset_id);

    CREATE TABLE webhook_deliveries (
      delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      integration_id UUID NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
      external_delivery_id TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      error TEXT,
      UNIQUE(integration_id,external_delivery_id)
    );

    CREATE TABLE relationship_edges (
      edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      source_name TEXT NOT NULL,
      external_edge_id TEXT NOT NULL,
      source_node TEXT NOT NULL,
      target_node TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      target_kind TEXT NOT NULL,
      target_asset_id TEXT,
      confidence DOUBLE PRECISION NOT NULL CHECK(confidence BETWEEN 0 AND 1),
      observed_at TIMESTAMPTZ NOT NULL,
      valid_until TIMESTAMPTZ,
      evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
      ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id,source_name,external_edge_id)
    );
    CREATE INDEX idx_edges_org_source ON relationship_edges(organization_id,source_node);
    CREATE INDEX idx_edges_org_target ON relationship_edges(organization_id,target_node);

    CREATE TABLE compliance_requirements (
      requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      framework TEXT NOT NULL,
      requirement_ref TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      weight DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK(weight > 0),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE(organization_id,framework,requirement_ref)
    );
    CREATE TABLE compliance_evidence (
      evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      requirement_id UUID NOT NULL REFERENCES compliance_requirements(requirement_id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('COMPLIANT','NON_COMPLIANT','UNKNOWN')),
      source_name TEXT NOT NULL,
      evidence_reference TEXT NOT NULL,
      asset_id TEXT,
      financial_impact_inr NUMERIC(18,2) CHECK(financial_impact_inr >= 0),
      confidence DOUBLE PRECISION NOT NULL CHECK(confidence BETWEEN 0 AND 1),
      observed_at TIMESTAMPTZ NOT NULL,
      valid_until TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK(valid_until > observed_at)
    );
    CREATE INDEX idx_compliance_evidence_current ON compliance_evidence(organization_id,requirement_id,observed_at DESC);

    CREATE TABLE business_risk_events (
      record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      event_key TEXT NOT NULL,
      category TEXT NOT NULL,
      annual_probability DOUBLE PRECISION NOT NULL CHECK(annual_probability BETWEEN 0 AND 1),
      mean_loss_inr NUMERIC(18,2) NOT NULL CHECK(mean_loss_inr >= 0),
      loss_coefficient_of_variation DOUBLE PRECISION NOT NULL CHECK(loss_coefficient_of_variation BETWEEN 0 AND 10),
      frequency_evidence TEXT NOT NULL,
      loss_evidence TEXT NOT NULL,
      shock_group TEXT,
      control_probability_reduction DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK(control_probability_reduction BETWEEN 0 AND 1),
      control_evidence TEXT,
      observed_at TIMESTAMPTZ NOT NULL,
      valid_until TIMESTAMPTZ NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id,event_key,observed_at),
      CHECK(valid_until > observed_at),
      CHECK(control_probability_reduction = 0 OR control_evidence IS NOT NULL)
    );
    CREATE INDEX idx_business_events_current ON business_risk_events(organization_id,active,valid_until);
    CREATE TABLE business_risk_runs (
      run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
      job_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL,
      input_hash TEXT NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_business_runs_org_created ON business_risk_runs(organization_id,created_at DESC);
    """)


def downgrade() -> None:
    op.execute("""
    DROP TABLE IF EXISTS business_risk_runs;
    DROP TABLE IF EXISTS business_risk_events;
    DROP TABLE IF EXISTS compliance_evidence;
    DROP TABLE IF EXISTS compliance_requirements;
    DROP TABLE IF EXISTS relationship_edges;
    DROP TABLE IF EXISTS webhook_deliveries;
    DROP TABLE IF EXISTS telemetry_events;
    """)
