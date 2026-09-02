"""Common database-first connector behavior."""

from backend.data_access import load_findings


def fetch_source(source_type: str, filename: str) -> list[dict]:
    return load_findings(source_type)


def source_info(name: str, source_type: str, filename: str) -> dict:
    findings = fetch_source(source_type, filename)
    return {"name": name, "status": "connected", "count": len(findings)}
