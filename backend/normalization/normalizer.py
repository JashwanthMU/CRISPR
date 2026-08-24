"""
Normalize raw findings from all connector sources into validated
Finding objects (backend.app.models.shared.Finding).
Invalid or incomplete records are dropped, not raised - one bad
finding shouldn't take down the whole correlation pipeline.
"""
from backend.app.models.shared import Finding, SourceType, Severity

SEVERITY_MAP = {
    "critical": Severity.CRITICAL, "crit": Severity.CRITICAL,
    "high": Severity.HIGH,
    "medium": Severity.MEDIUM, "med": Severity.MEDIUM,
    "low": Severity.LOW,
}

def _normalize_severity(raw_severity) -> Severity:
    if isinstance(raw_severity, Severity):
        return raw_severity
    return SEVERITY_MAP.get(str(raw_severity).strip().lower(), Severity.MEDIUM)

def normalize_finding(raw: dict) -> Finding | None:
    """Normalize + validate a single raw finding. Returns None if unusable."""
    if not raw.get("asset_id") or not raw.get("finding_id"):
        return None

    try:
        return Finding(
            finding_id=raw["finding_id"],
            source_type=SourceType(raw["source_type"]),
            source_name=raw.get("source_name", "UNKNOWN"),
            asset_id=raw["asset_id"],
            finding_type=raw.get("finding_type", "UNKNOWN"),
            title=raw.get("title", ""),
            cve=raw.get("cve"),
            severity=_normalize_severity(raw.get("severity", "medium")),
            confidence=float(raw.get("confidence", 0.5)),
            first_seen=raw.get("first_seen", ""),
            status=raw.get("status", "OPEN"),
        )
    except (ValueError, KeyError):
        # bad source_type enum value, or other malformed field - skip, don't crash
        return None

def normalize_all(raw_findings: list[dict]) -> list[Finding]:
    normalized = []
    for raw in raw_findings:
        f = normalize_finding(raw)
        if f:
            normalized.append(f)
    return normalized