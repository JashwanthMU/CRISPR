"""Authenticated source-ingestion control and status APIs."""

from datetime import date, datetime
from hashlib import sha256
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ValidationError

from backend.app.auth import AuthUser, require_security
from backend.connectors.nvd import ExternalVulnerabilityDataError, NVDClient
from backend.data_access import demo_mode_enabled, load_assets, load_findings
from backend.ingestion.store import (
    ingestion_status, refresh_demo_sources, upsert_assets,
    upsert_control_postures, upsert_findings,
)


router = APIRouter()


class AssetCveMapping(BaseModel):
    asset_id: str = Field(min_length=1, max_length=32)
    cve: str = Field(pattern=r"(?i)^CVE-\d{4}-\d{4,}$")
    first_seen: date
    patch_age_days: int = Field(ge=0, le=36500)
    mapping_source: str = Field(
        min_length=2,
        max_length=120,
        description="Scanner, SBOM or CMDB source proving this CVE affects the asset",
    )
    finding_id: str | None = Field(default=None, max_length=64)
    confidence: float = Field(default=1.0, ge=0, le=1)
    patch_available: bool | None = None


class NvdSyncRequest(BaseModel):
    mappings: list[AssetCveMapping] = Field(min_length=1, max_length=500)
    include_epss: Literal[True] = True


class LiveAsset(BaseModel):
    asset_id: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=160)
    type: str = Field(min_length=1, max_length=80)
    business_unit: str = Field(min_length=1, max_length=120)
    business_service: str = Field(min_length=1, max_length=120)
    criticality: int = Field(ge=1, le=5)
    data_sensitivity: int = Field(ge=1, le=5)
    revenue_dependency: int = Field(ge=0, le=5)
    internet_facing: bool
    is_regulated: bool
    value_inr: float = Field(ge=0)
    downtime_cost_per_hour_inr: float = Field(ge=0)
    regulatory_exposure_inr: float = Field(ge=0)


class AssetIngestionRequest(BaseModel):
    source_name: str = Field(min_length=2, max_length=120)
    observed_at: datetime
    assets: list[LiveAsset] = Field(min_length=1, max_length=10000)


class ControlPosture(BaseModel):
    asset_id: str = Field(min_length=1, max_length=32)
    mfa_coverage: float = Field(ge=0, le=1)
    edr_coverage: float = Field(ge=0, le=1)
    waf_enabled: bool
    patch_compliance: float = Field(ge=0, le=1)
    segmentation: float = Field(ge=0, le=1)
    logging_coverage: float = Field(ge=0, le=1)


class ControlPostureIngestionRequest(BaseModel):
    source_name: str = Field(min_length=2, max_length=120)
    observed_at: datetime
    postures: list[ControlPosture] = Field(min_length=1, max_length=10000)


@router.get("/status")
def get_ingestion_status(
    _: AuthUser = Depends(require_security),
) -> dict:
    sources = ingestion_status()
    return {"total_sources": len(sources), "sources": sources}


@router.get("/nvd/feed")
def global_nvd_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    days: int = Query(7, ge=1, le=120),
    _: AuthUser = Depends(require_security),
) -> dict:
    """Read-only global NVD feed; records are not organizational findings."""
    try:
        return NVDClient().fetch_recent_cves(
            start_index=(page - 1) * page_size,
            results_per_page=page_size,
            days=days,
        )
    except (ExternalVulnerabilityDataError, ValueError) as error:
        raise HTTPException(status_code=502, detail=f"NVD feed request failed: {error}") from error


@router.post("/assets", status_code=201)
def ingest_live_assets(
    body: AssetIngestionRequest,
    _: AuthUser = Depends(require_security),
) -> dict:
    if demo_mode_enabled():
        raise HTTPException(status_code=409, detail="Live asset ingestion requires CRISPR_DATA_MODE=live")
    records = []
    for asset in body.assets:
        record = asset.model_dump()
        record["provenance"] = {
            "source": body.source_name,
            "observed_at": body.observed_at.isoformat(),
            "synthetic_fields": [],
        }
        records.append(record)
    return {
        "ingested": upsert_assets(records, data_origin="LIVE"),
        "data_origin": "LIVE",
        "source_name": body.source_name,
    }


@router.post("/control-postures", status_code=201)
def ingest_live_control_postures(
    body: ControlPostureIngestionRequest,
    _: AuthUser = Depends(require_security),
) -> dict:
    if demo_mode_enabled():
        raise HTTPException(status_code=409, detail="Live control-posture ingestion requires CRISPR_DATA_MODE=live")
    known_assets = {asset["asset_id"] for asset in load_assets()}
    unknown = sorted({row.asset_id for row in body.postures} - known_assets)
    if unknown:
        raise HTTPException(status_code=422, detail={"error": "Unknown LIVE assets", "asset_ids": unknown})
    records = [row.model_dump() for row in body.postures]
    return {
        "ingested": upsert_control_postures(
            records, body.source_name, body.observed_at, data_origin="LIVE"
        ),
        "data_origin": "LIVE",
        "source_name": body.source_name,
    }


@router.post("/refresh")
def refresh_sources(
    _: AuthUser = Depends(require_security),
) -> dict:
    if not demo_mode_enabled():
        raise HTTPException(status_code=409, detail="Demo fixture refresh is disabled in live mode")
    counts = refresh_demo_sources()
    return {
        "status": "completed",
        "records_processed": sum(counts.values()),
        "sources": counts,
    }


@router.post("/nvd/sync")
def sync_nvd(
    body: NvdSyncRequest,
    _: AuthUser = Depends(require_security),
) -> dict:
    """Enrich explicit asset/CVE mappings using current NVD and EPSS data."""
    if demo_mode_enabled():
        raise HTTPException(
            status_code=409,
            detail="NVD sync writes LIVE records; set CRISPR_DATA_MODE=live",
        )
    assets = {asset["asset_id"] for asset in load_assets()}
    unknown_assets = sorted({row.asset_id for row in body.mappings} - assets)
    if unknown_assets:
        raise HTTPException(
            status_code=422,
            detail={"error": "CVE mappings reference unknown LIVE assets", "asset_ids": unknown_assets},
        )

    client = NVDClient()
    cve_ids = sorted({row.cve.upper() for row in body.mappings})
    try:
        epss = client.fetch_epss(cve_ids) if body.include_epss else {}
    except ExternalVulnerabilityDataError as error:
        raise HTTPException(status_code=502, detail=f"EPSS request failed: {error}") from error

    nvd_records = {}
    errors = []
    for cve_id in cve_ids:
        try:
            nvd_records[cve_id] = client.fetch_cve(cve_id)
        except (ExternalVulnerabilityDataError, ValueError) as error:
            errors.append({"cve": cve_id, "error": str(error)})

    findings = []
    for mapping in body.mappings:
        cve_id = mapping.cve.upper()
        nvd = nvd_records.get(cve_id)
        if not nvd:
            continue
        epss_fields = epss.get(cve_id, {})
        required = {
            "cvss", "attack_vector", "attack_complexity", "privileges_required",
            "user_interaction", "scope", "exploitability_score", "impact_score",
        }
        missing = sorted(field for field in required if nvd.get(field) is None)
        if body.include_epss and not epss_fields:
            missing.extend(["epss_score", "epss_percentile"])
        if missing:
            errors.append({"cve": cve_id, "asset_id": mapping.asset_id, "error": f"missing model fields: {', '.join(missing)}"})
            continue
        digest = sha256(f"{mapping.asset_id}:{cve_id}".encode()).hexdigest()[:16]
        findings.append({
            **nvd,
            **epss_fields,
            "finding_id": mapping.finding_id or f"NVD-{digest}",
            "source_type": "VULNERABILITY_SCANNER",
            "source_name": f"{mapping.mapping_source} + NVD/NIST",
            "asset_id": mapping.asset_id,
            "finding_type": "CVE",
            "first_seen": mapping.first_seen.isoformat(),
            "patch_age_days": mapping.patch_age_days,
            "patch_available": mapping.patch_available,
            "confidence": mapping.confidence,
            "status": "OPEN",
            "provenance": {
                "asset_cve_mapping": mapping.mapping_source,
                "vulnerability_metadata": "NVD CVE API 2.0",
                "exploitation_probability": "FIRST EPSS" if body.include_epss else None,
                "synthetic_fields": [],
            },
        })
    if findings:
        upsert_findings(findings, data_origin="LIVE")
    return {
        "requested_mappings": len(body.mappings),
        "ingested": len(findings),
        "failed": len(errors),
        "errors": errors,
        "data_origin": "LIVE",
        "nvd_api": "2.0",
        "fallback_used": False,
    }


@router.post("/nvd/refresh")
def refresh_nvd(
    user: AuthUser = Depends(require_security),
) -> dict:
    """Refresh NVD and EPSS fields for already mapped LIVE CVE findings."""
    if demo_mode_enabled():
        raise HTTPException(
            status_code=409,
            detail="NVD refresh requires CRISPR_DATA_MODE=live",
        )
    mappings = []
    mapping_errors = []
    for finding in load_findings("VULNERABILITY_SCANNER"):
        if not finding.get("cve"):
            continue
        provenance = finding.get("provenance", {})
        mapping_source = provenance.get("asset_cve_mapping")
        if not mapping_source:
            # A real scanner finding is itself the asset/CVE evidence.
            mapping_source = finding.get("source_name")
        try:
            mappings.append(AssetCveMapping.model_validate({
                "asset_id": finding.get("asset_id"),
                "cve": finding.get("cve"),
                "first_seen": finding.get("first_seen"),
                "patch_age_days": finding.get("patch_age_days"),
                "patch_available": finding.get("patch_available"),
                "mapping_source": mapping_source,
                "finding_id": finding.get("finding_id"),
                "confidence": finding.get("confidence", 1.0),
            }))
        except ValidationError as error:
            mapping_errors.append({
                "finding_id": finding.get("finding_id"),
                "cve": finding.get("cve"),
                "error": "missing or invalid scanner-owned mapping fields",
                "fields": sorted({item["loc"][0] for item in error.errors()}),
            })
    if not mappings:
        raise HTTPException(
            status_code=409,
            detail={"error": "No refreshable LIVE CVE findings exist", "records": mapping_errors},
        )
    result = sync_nvd(NvdSyncRequest(mappings=mappings), user)
    result["errors"] = mapping_errors + result["errors"]
    result["failed"] += len(mapping_errors)
    return result
