"""XDR connector backed by the live ingestion store."""

from backend.connectors.base import fetch_source, source_info


def fetch_findings() -> list[dict]:
    return fetch_source("XDR", "xdr_events.json")


def get_source_info() -> dict:
    return source_info("XDR", "XDR", "xdr_events.json")
