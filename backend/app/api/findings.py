"""Finding APIs backed by the demo connector datasets."""

from collections import Counter, defaultdict

from fastapi import APIRouter, HTTPException

from backend.connectors.bug_bounty.connector import fetch_findings as fetch_bug_bounty
from backend.connectors.cmdb.connector import get_source_info as get_cmdb_info
from backend.connectors.cspm.connector import fetch_findings as fetch_cspm
from backend.connectors.cspm.connector import get_source_info as get_cspm_info
from backend.connectors.edr.connector import fetch_findings as fetch_edr
from backend.connectors.iam.connector import fetch_findings as fetch_iam
from backend.connectors.siem.connector import fetch_findings as fetch_siem
from backend.connectors.threat_intel.connector import fetch_findings as fetch_threat_intel
from backend.connectors.vulnerability_scanner.connector import fetch_findings as fetch_vulns
from backend.connectors.xdr.connector import fetch_findings as fetch_xdr
from backend.data_access import LiveDataUnavailable


router = APIRouter()
CONNECTORS = (
    fetch_bug_bounty,
    fetch_vulns,
    fetch_edr,
    fetch_xdr,
    fetch_siem,
    fetch_iam,
    fetch_threat_intel,
    fetch_cspm,
)

def load_all_findings() -> list[dict]:
    findings: list[dict] = []
    unavailable: list[str] = []
    for fetch in CONNECTORS:
        try:
            findings.extend(fetch())
        except LiveDataUnavailable as error:
            # Live sources are independent: an empty Bug Bounty feed must not
            # hide valid NVD/scanner findings from another connected source.
            unavailable.append(str(error))
    if not findings:
        detail = "; ".join(unavailable) if unavailable else "No live findings have been ingested"
        raise LiveDataUnavailable(detail)
    return findings

@router.get("")
def get_all_findings() -> dict:
    findings = load_all_findings()
    return {"total": len(findings), "findings": findings}

@router.get("/sources")
def get_sources() -> list[dict]:
    counts = Counter(finding["source_type"] for finding in load_all_findings())
    source_info = {
        source: {"source": source, "count": count, "status": "connected"}
        for source, count in counts.items()
    }
    for info in (get_cspm_info(), get_cmdb_info()):
        source_info[info["source"]] = info
    return [source_info[source] for source in sorted(source_info)]

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


@router.get("/{finding_id}")
def get_finding(finding_id: str) -> dict:
    finding = next((row for row in load_all_findings() if row.get("finding_id") == finding_id), None)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding
