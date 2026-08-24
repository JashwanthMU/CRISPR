"""Finding APIs backed by the demo connector datasets."""

import json
from collections import Counter, defaultdict
from pathlib import Path

from fastapi import APIRouter


router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[3] / "data/demo"
FINDING_FILES = (
    "bug_bounty.json",
    "vulnerabilities.json",
    "edr_events.json",
    "xdr_events.json",
    "siem_events.json",
    "iam.json",
    "cspm.json",
    "threat_intel.json",
)


def load_all_findings() -> list[dict]:
    findings: list[dict] = []
    for filename in FINDING_FILES:
        path = DATA_DIR / filename
        if path.exists():
            with path.open(encoding="utf-8") as file:
                findings.extend(json.load(file))
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
def correlate_findings() -> dict:
    """Group findings by asset and expose the number of distinct sources."""
    grouped: dict[str, list[dict]] = defaultdict(list)
    for finding in load_all_findings():
        grouped[finding["asset_id"]].append(finding)

    correlations = []
    for asset_id, findings in sorted(grouped.items()):
        sources = sorted({finding["source_type"] for finding in findings})
        correlations.append(
            {
                "asset_id": asset_id,
                "finding_count": len(findings),
                "source_count": len(sources),
                "sources": sources,
                "findings": findings,
            }
        )

    return {"total_assets": len(correlations), "correlations": correlations}


@router.get("/asset/{asset_id}")
def get_findings_by_asset(asset_id: str) -> list[dict]:
    return [
        finding
        for finding in load_all_findings()
        if finding.get("asset_id") == asset_id
    ]
