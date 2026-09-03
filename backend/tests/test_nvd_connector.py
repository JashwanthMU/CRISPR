from backend.connectors.nvd import NVDClient, parse_nvd_cve
import pytest
from pydantic import ValidationError


SAMPLE_CVE = {
    "id": "CVE-2024-9999",
    "sourceIdentifier": "security@example.org",
    "published": "2024-01-02T00:00:00.000",
    "lastModified": "2024-02-03T00:00:00.000",
    "vulnStatus": "Analyzed",
    "cisaExploitAdd": "2024-02-04",
    "descriptions": [{"lang": "en", "value": "Example vulnerability"}],
    "weaknesses": [{"description": [{"lang": "en", "value": "CWE-89"}]}],
    "references": [{"url": "https://example.org/advisory"}],
    "metrics": {
        "cvssMetricV31": [{
            "source": "nvd@nist.gov", "type": "Primary",
            "exploitabilityScore": 3.9, "impactScore": 5.9,
            "cvssData": {
                "baseScore": 9.8, "baseSeverity": "CRITICAL",
                "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                "attackVector": "NETWORK", "attackComplexity": "LOW",
                "privilegesRequired": "NONE", "userInteraction": "NONE",
                "scope": "UNCHANGED",
            },
        }]
    },
}


def test_parse_nvd_cve_preserves_metrics_and_provenance():
    row = parse_nvd_cve(SAMPLE_CVE)
    assert row["cve"] == "CVE-2024-9999"
    assert row["cvss"] == 9.8
    assert row["attack_vector"] == 0
    assert row["flag_sqli"] == 1
    assert row["exploited_in_wild"] is True
    assert row["nvd_url"].endswith("CVE-2024-9999")
    assert row["nvd_retrieved_at"]


def test_nvd_client_sends_key_as_header(monkeypatch):
    import httpx

    seen = {}

    def handler(request):
        seen["api_key"] = request.headers.get("apiKey")
        return httpx.Response(200, json={"vulnerabilities": [{"cve": SAMPLE_CVE}]})

    monkeypatch.setenv("NVD_API_KEY", "secret-key")
    transport_client = httpx.Client(
        transport=httpx.MockTransport(handler),
        headers={"apiKey": "secret-key"},
    )
    result = NVDClient(client=transport_client).fetch_cve("cve-2024-9999")
    assert result["cvss"] == 9.8
    assert seen["api_key"] == "secret-key"


def test_recent_global_feed_is_paginated_and_not_asset_mapped(monkeypatch):
    client = NVDClient()
    captured = {}

    def fake_get(url, params, *, apply_nvd_throttle=False):
        captured.update(params)
        return {
            "totalResults": 501,
            "startIndex": 50,
            "resultsPerPage": 50,
            "vulnerabilities": [{"cve": SAMPLE_CVE}],
        }

    monkeypatch.setattr(client, "_get_json", fake_get)
    result = client.fetch_recent_cves(start_index=50, results_per_page=50, days=7)
    assert result["total_results"] == 501
    assert result["items"][0]["cve"] == "CVE-2024-9999"
    assert "asset_id" not in result["items"][0]
    assert captured["startIndex"] == "50"
    assert captured["resultsPerPage"] == "50"
    assert captured["pubStartDate"] < captured["pubEndDate"]


def test_missing_cvss_is_not_fabricated():
    record = {key: value for key, value in SAMPLE_CVE.items() if key != "metrics"}
    row = parse_nvd_cve(record)
    assert "cvss" not in row
    assert "exploitability_score" not in row


def test_nvd_sync_cannot_disable_required_epss_enrichment():
    from backend.app.api.ingestion import NvdSyncRequest

    with pytest.raises(ValidationError):
        NvdSyncRequest.model_validate({"mappings": [{
            "asset_id": "asset-1", "cve": "CVE-2024-9999",
            "first_seen": "2026-09-01", "patch_age_days": 1,
            "mapping_source": "Scanner",
        }], "include_epss": False})


def test_live_nvd_sync_requires_asset_mapping_and_persists_live_data(monkeypatch):
    from backend.app.api import ingestion

    class FakeNvdClient:
        def fetch_epss(self, cve_ids):
            return {"CVE-2024-9999": {"epss_score": 0.7, "epss_percentile": 0.9, "epss_date": "2026-09-03"}}

        def fetch_cve(self, cve_id):
            return parse_nvd_cve(SAMPLE_CVE)

    captured = []
    monkeypatch.setenv("CRISPR_DATA_MODE", "live")
    monkeypatch.setattr(ingestion, "NVDClient", FakeNvdClient)
    monkeypatch.setattr(ingestion, "load_assets", lambda: [{"asset_id": "asset-1"}])
    monkeypatch.setattr(ingestion, "upsert_findings", lambda rows, data_origin: captured.extend(rows) or len(rows))
    request = ingestion.NvdSyncRequest.model_validate({"mappings": [{
        "asset_id": "asset-1", "cve": "CVE-2024-9999", "first_seen": "2026-09-01",
        "patch_age_days": 3, "mapping_source": "Tenable",
    }]})

    result = ingestion.sync_nvd(request, None)

    assert result["ingested"] == 1
    assert captured[0]["provenance"]["synthetic_fields"] == []
    assert captured[0]["epss_score"] == 0.7
    assert captured[0]["source_name"] == "Tenable + NVD/NIST"
