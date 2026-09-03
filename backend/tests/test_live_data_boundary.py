from contextlib import contextmanager

import pytest

from backend import data_access


@contextmanager
def _unavailable_database():
    raise RuntimeError("database unavailable")
    yield


def test_live_mode_never_falls_back_to_asset_fixture(monkeypatch):
    monkeypatch.setenv("CRISPR_DATA_MODE", "live")
    monkeypatch.setattr(data_access, "get_connection", _unavailable_database)
    with pytest.raises(data_access.LiveDataUnavailable):
        data_access.load_assets()


def test_live_mode_never_falls_back_to_finding_fixture(monkeypatch):
    monkeypatch.setenv("CRISPR_DATA_MODE", "live")
    monkeypatch.setattr(data_access, "get_connection", _unavailable_database)
    with pytest.raises(data_access.LiveDataUnavailable):
        data_access.load_findings("VULNERABILITY_SCANNER")


def test_demo_mode_is_explicit_and_can_load_fixtures(monkeypatch):
    monkeypatch.setenv("CRISPR_DATA_MODE", "demo")
    monkeypatch.setattr(data_access, "get_connection", _unavailable_database)
    assert data_access.load_assets()
    assert data_access.load_findings("VULNERABILITY_SCANNER")
