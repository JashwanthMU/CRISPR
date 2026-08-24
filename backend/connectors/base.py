"""Common database-first connector behavior."""

from psycopg import Error as PsycopgError

from backend.ingestion.store import fetch_findings as fetch_stored, load_json


def fetch_source(source_type: str, filename: str) -> list[dict]:
    try:
        return fetch_stored(source_type)
    except PsycopgError:
        return load_json(filename)


def source_info(name: str, source_type: str, filename: str) -> dict:
    findings = fetch_source(source_type, filename)
    return {"name": name, "status": "connected", "count": len(findings)}
