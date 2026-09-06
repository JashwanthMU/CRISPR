"""Regression tests for the Phase 6 organization boundary."""

from pathlib import Path
from uuid import uuid4

import pytest


def test_ingestion_conflicts_are_tenant_scoped():
    source = (Path(__file__).parents[1] / "ingestion" / "store.py").read_text()
    assert "ON CONFLICT (organization_id, asset_id)" in source
    assert "ON CONFLICT (organization_id, finding_id)" in source
    assert "ON CONFLICT (organization_id, control_id)" in source
    assert "organization_id = EXCLUDED.organization_id" not in source


def test_tenant_migration_has_composite_foreign_keys():
    migration = (
        Path(__file__).parents[1]
        / "database/migrations/versions/0005_tenant_isolation.py"
    ).read_text()
    assert "UNIQUE(organization_id,asset_id)" in migration
    assert "UNIQUE(organization_id,finding_id)" in migration
    assert "FOREIGN KEY(organization_id,asset_id)" in migration
    assert "FOREIGN KEY(organization_id,finding_id)" in migration


def test_threat_intelligence_passes_organization(monkeypatch):
    from backend.app.api import threat_intel

    organization_id = uuid4()
    captured = {}

    def load(source_type, organization_id=None):
        captured.update(source_type=source_type, organization_id=organization_id)
        return []

    monkeypatch.setattr(threat_intel, "load_findings", load)
    assert threat_intel._observations(organization_id) == []
    assert captured == {
        "source_type": "THREAT_INTEL",
        "organization_id": organization_id,
    }


def test_synthetic_analytics_refused_in_live_mode(monkeypatch):
    from backend.data_access import LiveDataUnavailable, require_demo_mode

    monkeypatch.setenv("CRISPR_DATA_MODE", "live")
    with pytest.raises(LiveDataUnavailable):
        require_demo_mode("Fixture-based anomaly detection")
