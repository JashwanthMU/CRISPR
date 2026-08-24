"""
Normalize findings from all sources into a common severity/confidence shape.
Input: raw findings from connectors (varying schemas per source_type).
Output: list of dicts with consistent keys used downstream by correlator.py.
"""

SEVERITY_MAP = {
    # normalize source-specific severity labels into one vocabulary
    "critical": "CRITICAL", "crit": "CRITICAL", "high": "HIGH",
    "medium": "MEDIUM", "med": "MEDIUM", "low": "LOW",
}

REQUIRED_FIELDS = ["finding_id", "asset_id", "source_type", "severity"]

def _normalize_severity(raw_severity: str) -> str:
    return SEVERITY_MAP.get(str(raw_severity).strip().lower(), "MEDIUM")

def normalize_finding(raw: dict) -> dict | None:
    """Normalize a single finding. Returns None if it's missing required fields."""
    if not raw.get("asset_id") or not raw.get("finding_id"):
        return None  # can't correlate a finding with no asset/id — drop it, don't crash

    return {
        "finding_id": raw["finding_id"],
        "asset_id": raw["asset_id"],
        "source_type": raw.get("source_type", "UNKNOWN"),
        "severity": _normalize_severity(raw.get("severity", "medium")),
        "detected_at": raw.get("detected_at"),
        "description": raw.get("description", ""),
    }

def normalize_all(raw_findings: list[dict]) -> list[dict]:
    normalized = []
    for raw in raw_findings:
        n = normalize_finding(raw)
        if n:
            normalized.append(n)
    return normalized