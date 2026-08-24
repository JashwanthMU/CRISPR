"""SIEM connector backed by the demo JSON dataset."""

from backend.connectors.base import fetch_source, source_info


def fetch_findings() -> list[dict]:
    return fetch_source("SIEM", "siem_events.json")


def get_source_info() -> dict:
    return source_info("SIEM", "SIEM", "siem_events.json")
