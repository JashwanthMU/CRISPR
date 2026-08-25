"""
backend/correlation/correlator.py

Correlation Engine (Member 2 - CRISPR)

Groups normalized Findings (from normalizer.py, already validated against
backend/app/models/shared.py) by asset_id, computes a source-diversity
confidence score, and produces RiskCase objects (shared.RiskCase schema).

OWNERSHIP NOTE:
RiskCase (shared.py) includes fields owned by OTHER members:
  - likelihood, loss_magnitude_inr, eal_inr, risk_score  -> Member 3 (risk-engine)
This module fills every field it legitimately owns (sources, confidence,
title, business_criticality via criticality.py) and leaves the risk-engine
fields as explicit 0 placeholders, marked TODO, so the shape is demo-ready
without pretending to own math that isn't correlation's job.
"""

from __future__ import annotations

import uuid
from typing import Callable, Optional

from backend.app.models.shared import Finding, RiskCase, SourceType, Severity

# ---------------------------------------------------------------------------
# Confidence rules (per spec)
# ---------------------------------------------------------------------------

BASE_CONFIDENCE = 0.60  # vulnerability scanner alone / default floor

SOURCE_CONFIDENCE_BOOST: dict[SourceType, float] = {
    SourceType.BUG_BOUNTY: 0.15,
    SourceType.XDR: 0.10,
    SourceType.THREAT_INTEL: 0.10,
    SourceType.SIEM: 0.08,
    SourceType.IAM: 0.07,
    SourceType.EDR: 0.05,
    # VULNERABILITY_SCANNER and CSPM contribute no boost - baseline sources.
}

MAX_CONFIDENCE = 0.94

SEVERITY_RANK = {
    Severity.CRITICAL: 4,
    Severity.HIGH: 3,
    Severity.MEDIUM: 2,
    Severity.LOW: 1,
}


def compute_confidence(sources: set[SourceType]) -> float:
    """Base 0.60 + additive per-unique-source boosts, capped at 1.0."""
    confidence = BASE_CONFIDENCE
    for source in sources:
        confidence += SOURCE_CONFIDENCE_BOOST.get(source, 0.0)

    return round(min(confidence, MAX_CONFIDENCE), 4)


def _highest_severity(findings: list[Finding]) -> Severity:
    return max(findings, key=lambda f: SEVERITY_RANK.get(f.severity, 0)).severity


def _build_title(asset_name: str, source_count: int, severity: Severity) -> str:
    """
    Plain-English risk case summary.
    e.g. "Payment Auth API — Multi-source compromise risk"
    (Stored in RiskCase.title - shared.py has no separate risk_title field.)
    """
    if source_count >= 4:
        descriptor = "Multi-source compromise risk"
    elif source_count >= 2:
        descriptor = "Corroborated risk"
    elif severity == Severity.CRITICAL:
        descriptor = "Critical single-source finding"
    else:
        descriptor = "Single-source finding"

    return f"{asset_name} — {descriptor}"


def correlate_findings(
    findings: list[Finding],
    asset_names: dict[str, str],
    criticality_lookup: Optional[Callable[[str], float]] = None,
) -> list[RiskCase]:
    """
    Group findings by asset_id and produce one RiskCase per asset.

    Args:
        findings: normalized Finding objects across all sources.
        asset_names: {asset_id: display_name}, e.g. from assets.json.
        criticality_lookup: optional fn(asset_id) -> business_criticality
            (0-100), typically criticality.py's calculate_business_criticality.
            Defaults to 0.0 if not supplied (e.g. asset not yet scored).

    Returns:
        List of RiskCase, sorted by confidence desc then severity desc.
    """
    grouped: dict[str, list[Finding]] = {}
    for f in findings:
        grouped.setdefault(f.asset_id, []).append(f)

    risk_cases: list[RiskCase] = []
    for asset_id, asset_findings in grouped.items():
        sources = {f.source_type for f in asset_findings}
        confidence = compute_confidence(sources)
        severity = _highest_severity(asset_findings)
        asset_name = asset_names.get(asset_id, asset_id)
        business_criticality = (
            criticality_lookup(asset_id) if criticality_lookup else 0.0
        )

        risk_cases.append(
            RiskCase(
                risk_case_id=f"RC-{asset_id}-{uuid.uuid4().hex[:6]}",
                title=_build_title(asset_name, len(sources), severity),
                asset_id=asset_id,
                sources=sorted(s.value for s in sources),
                confidence=confidence,
                business_criticality=business_criticality,
                # --- TODO(risk-engine / Member 3): these are not owned by
                # correlation. Left as 0 placeholders so the schema is
                # complete; risk-engine should populate post-correlation.
                likelihood=0.0,
                loss_magnitude_inr=0.0,
                eal_inr=0.0,
                risk_score=0,
                # ---------------------------------------------------------
                status="ACTIVE",
            )
        )

    risk_cases.sort(
        key=lambda rc: (rc.confidence, rc.business_criticality),
        reverse=True,
    )
    return risk_cases


def get_risk_cases_for_asset(
    asset_id: str,
    findings: list[Finding],
    asset_names: dict[str, str],
    criticality_lookup: Optional[Callable[[str], float]] = None,
) -> list[RiskCase]:
    """Convenience helper for GET /api/assets/{id}/risk-cases."""
    asset_findings = [f for f in findings if f.asset_id == asset_id]
    if not asset_findings:
        return []
    return correlate_findings(asset_findings, asset_names, criticality_lookup)


# ---------------------------------------------------------------------------
# Manual smoke test (matches the A003 demo story)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    demo_findings = [
        Finding(
            finding_id="F1", source_type=SourceType.VULNERABILITY_SCANNER,
            source_name="Nessus", asset_id="A003", finding_type="vuln",
            title="SQLi in auth endpoint", severity=Severity.CRITICAL,
            confidence=0.6, first_seen="2026-08-01",
        ),
        Finding(
            finding_id="F2", source_type=SourceType.BUG_BOUNTY,
            source_name="HackerOne", asset_id="A003", finding_type="vuln",
            title="Auth bypass via JWT confusion", severity=Severity.CRITICAL,
            confidence=0.75, first_seen="2026-08-02",
        ),
        Finding(
            finding_id="F3", source_type=SourceType.XDR,
            source_name="CrowdStrike", asset_id="A003", finding_type="behavior",
            title="Anomalous login velocity", severity=Severity.HIGH,
            confidence=0.7, first_seen="2026-08-03",
        ),
        Finding(
            finding_id="F4", source_type=SourceType.IAM,
            source_name="Okta", asset_id="A003", finding_type="identity",
            title="Stale privileged service account", severity=Severity.HIGH,
            confidence=0.67, first_seen="2026-08-04",
        ),
        Finding(
            finding_id="F5", source_type=SourceType.THREAT_INTEL,
            source_name="MISP", asset_id="A003", finding_type="active_exploitation",
            title="CVE actively exploited by APT groups targeting Indian fintech",
            severity=Severity.CRITICAL, confidence=0.88, first_seen="2026-08-08",
        ),
    ]
    names = {"A003": "Payment Auth API"}
    for case in correlate_findings(demo_findings, names, criticality_lookup=lambda aid: 96.0):
        print(case.model_dump_json(indent=2))
