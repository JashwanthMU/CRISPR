from backend.app.api import findings
from backend.data_access import LiveDataUnavailable


def test_one_unavailable_source_does_not_hide_valid_findings(monkeypatch):
    expected = {"finding_id": "NVD-1", "source_type": "VULNERABILITY_SCANNER"}

    def unavailable():
        raise LiveDataUnavailable("source is empty")

    monkeypatch.setattr(findings, "CONNECTORS", (unavailable, lambda: [expected], unavailable))
    assert findings.load_all_findings() == [expected]


def test_all_unavailable_sources_return_explicit_unavailability(monkeypatch):
    def unavailable():
        raise LiveDataUnavailable("source is empty")

    monkeypatch.setattr(findings, "CONNECTORS", (unavailable, unavailable))
    try:
        findings.load_all_findings()
    except LiveDataUnavailable as error:
        assert "source is empty" in str(error)
    else:
        raise AssertionError("expected LiveDataUnavailable")
