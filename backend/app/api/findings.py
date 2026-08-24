"""Finding APIs backed by the demo connector datasets."""

from collections import Counter, defaultdict

from fastapi import APIRouter

from backend.connectors.bug_bounty.connector import fetch_findings as fetch_bug_bounty
from backend.connectors.edr.connector import fetch_findings as fetch_edr
from backend.connectors.iam.connector import fetch_findings as fetch_iam
from backend.connectors.siem.connector import fetch_findings as fetch_siem
from backend.connectors.threat_intel.connector import fetch_findings as fetch_threat_intel
from backend.connectors.vulnerability_scanner.connector import fetch_findings as fetch_vulns
from backend.connectors.xdr.connector import fetch_findings as fetch_xdr


router = APIRouter()
CONNECTORS = (
    fetch_bug_bounty,
    fetch_vulns,
    fetch_edr,
    fetch_xdr,
    fetch_siem,
    fetch_iam,
    fetch_threat_intel,
)

def load_all_findings() -> list[dict]:
    findings: list[dict] = []
    for fetch in CONNECTORS:
        findings.extend(fetch())
    return findings

@router.get("")
def get_all_findings() -> dict:
    findings = load_all_findings()
    return {"total": len(findings), "findings": findings}

@router.get("/sources")
def get_sources() -> list[dict]:
    counts = Counter(finding["source_type"] for finding in load_all_findings())
    return [
        {"source": source, "count": count, "status": "connected"}
        for source, count in sorted(counts.items())
    ]

@router.get("/correlate")
def group_findings_by_asset() -> dict:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for finding in load_all_findings():
        grouped[finding["asset_id"]].append(finding)
    correlations = []
    for asset_id, findings in sorted(grouped.items()):
        sources = sorted({finding["source_type"] for finding in findings})
        correlations.append({
            "asset_id": asset_id,
            "finding_count": len(findings),
            "source_count": len(sources),
            "sources": sources,
            "findings": findings,
        })
    return {"total_assets": len(correlations), "correlations": correlations}

@router.get("/asset/{asset_id}")
def get_findings_by_asset(asset_id: str) -> list[dict]:
    return [
        finding
        for finding in load_all_findings()
        if finding.get("asset_id") == asset_id
    ]
