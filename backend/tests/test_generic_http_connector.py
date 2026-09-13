import httpx
import pytest

from backend.connectors.generic_http import GenericHTTPConnector


def test_generic_connector_maps_items_and_cursor(monkeypatch):
    monkeypatch.setenv("ALLOW_INSECURE_CONNECTOR_HTTP", "true")
    transport = httpx.MockTransport(lambda request: httpx.Response(
        200, json={"records": [{"id": "evt-1"}], "after": "next-1"}
    ))
    connector = GenericHTTPConnector(
        {"base_url": "http://collector.test", "events_path": "/events",
         "health_path": "/health", "items_field": "records", "next_cursor_field": "after"},
        {"token": "secret"}, httpx.Client(transport=transport),
    )
    page = connector.fetch_findings()
    assert page.items == [{"id": "evt-1"}]
    assert page.next_cursor == {"value": "next-1"}


def test_generic_connector_rejects_insecure_or_absolute_paths(monkeypatch):
    monkeypatch.delenv("ALLOW_INSECURE_CONNECTOR_HTTP", raising=False)
    with pytest.raises(RuntimeError, match="HTTPS"):
        GenericHTTPConnector({"base_url": "http://collector.test"}, {})
    connector = GenericHTTPConnector(
        {"base_url": "https://collector.test", "events_path": "https://attacker.test/events"},
        {}, httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(200, json=[]))),
    )
    with pytest.raises(RuntimeError, match="relative"):
        connector.fetch_findings()
