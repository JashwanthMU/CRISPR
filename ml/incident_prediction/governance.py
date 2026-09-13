"""Reproducible runtime validation and honest drift/data-quality reporting."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ml.incident_prediction.model import get_model_info, predict_incident

MODEL_DIR = Path(__file__).parent
REQUIRED_FEATURES = (
    "cvss_score", "epss_score", "epss_percentile", "days_since_published",
    "severity_encoded", "is_cert_in", "attack_vector", "attack_complexity",
    "privileges_required", "user_interaction", "scope", "exploitability_score",
    "impact_score", "flag_rce", "flag_sqli", "flag_xss",
    "flag_buffer_overflow", "flag_priv_escalation", "flag_dos", "flag_dir_traversal",
)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_artifacts() -> dict[str, Any]:
    manifest_path = MODEL_DIR / "artifact_checksums.json"
    if not manifest_path.is_file():
        return {"status": "FAIL", "reason": "artifact_checksums.json is missing", "files": {}}
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    results = {}
    for relative, expected in manifest.get("files", {}).items():
        candidate = (MODEL_DIR / relative).resolve()
        try:
            candidate.relative_to(MODEL_DIR.resolve())
        except ValueError:
            results[relative] = {"status": "FAIL", "reason": "path escapes model directory"}
            continue
        actual = _sha256(candidate) if candidate.is_file() else None
        results[relative] = {
            "status": "PASS" if actual == expected else "FAIL",
            "expected_sha256": expected,
            "actual_sha256": actual,
        }
    ok = bool(results) and all(row["status"] == "PASS" for row in results.values())
    return {"status": "PASS" if ok else "FAIL", "algorithm": "sha256", "files": results}


def _tier_policy_check(bands: list[dict]) -> dict:
    ordered = sorted(bands, key=lambda row: float(row["min"]))
    cursor = 0.0
    errors = []
    for band in ordered:
        lo, hi = float(band["min"]), float(band["max"])
        if lo != cursor:
            errors.append(f"gap or overlap begins at {cursor}")
        if hi <= lo:
            errors.append(f"invalid interval {lo}-{hi}")
        cursor = hi
    if cursor != 1.0:
        errors.append("bands do not end at 1.0")
    return {"status": "PASS" if not errors else "FAIL", "errors": errors, "bands": bands}


def validate_runtime() -> dict[str, Any]:
    """Validate shipped artifacts and inference; never repeat metadata as evidence."""
    info = get_model_info()
    checks: dict[str, Any] = {
        "artifact_integrity": verify_artifacts(),
        "feature_contract": {
            "status": "PASS" if tuple(info.get("features") or ()) == REQUIRED_FEATURES else "FAIL",
            "expected_count": len(REQUIRED_FEATURES),
            "actual_count": len(info.get("features") or []),
        },
        "tier_policy": _tier_policy_check(info.get("probability_bands") or []),
        "portable_calibration": {
            "status": "PASS" if info.get("calibrated") and info.get("calibration_runtime") == "portable five-fold sigmoid ensemble" else "FAIL",
            "runtime": info.get("calibration_runtime"),
        },
    }
    cases = [
        {"name": "low", "cvss": 3.1, "epss_score": 0.001, "epss_percentile": 0.1,
         "days_since_published": 120, "exploitability_score": 1.0, "impact_score": 2.0},
        {"name": "medium", "cvss": 6.5, "epss_score": 0.08, "epss_percentile": 0.7,
         "days_since_published": 60, "exploitability_score": 2.0, "impact_score": 4.0},
        {"name": "high", "cvss": 9.8, "epss_score": 0.92, "epss_percentile": 0.99,
         "days_since_published": 10, "exploitability_score": 3.9, "impact_score": 5.9},
    ]
    inference = []
    for case in cases:
        args = {
            "cvss": case["cvss"], "exploit_in_wild": False, "patch_age_days": 0,
            "internet_facing": True, "control_effectiveness": 0.5,
            "epss_score": case["epss_score"], "epss_percentile": case["epss_percentile"],
            "days_since_published": case["days_since_published"],
            "exploitability_score": case["exploitability_score"], "impact_score": case["impact_score"],
        }
        first, second = predict_incident(**args), predict_incident(**args)
        probability = first.get("probability")
        passed = (
            first == second and isinstance(probability, (int, float)) and 0 <= probability <= 1
            and first.get("model") == "xgb_v4_calibrated (Platt)"
        )
        inference.append({"case": case["name"], "status": "PASS" if passed else "FAIL",
                          "probability": probability, "tier": first.get("tier"),
                          "model": first.get("model"), "deterministic": first == second})
    checks["inference_cases"] = {"status": "PASS" if all(x["status"] == "PASS" for x in inference) else "FAIL",
                                 "cases": inference}
    runtime_pass = all(value.get("status") == "PASS" for value in checks.values())
    return {
        "validation_type": "runtime_artifact_and_contract",
        "status": "PASS" if runtime_pass else "FAIL",
        "model_version": info.get("model_version"),
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
        "metric_reproducibility": {
            "status": "NOT_ASSESSABLE",
            "reason": "The exact hash-identified holdout feature rows and labels are not shipped.",
            "metadata_metrics_are_evidence": False,
        },
        "approved_uses": ["CVE prioritization", "relative risk ranking"],
        "financial_use": {
            "status": "NOT_APPROVED",
            "reason": "The target is CISA KEV membership, not annual incident frequency. A separately validated frequency model is required for direct EAL use.",
        },
    }


def assess_live_data(rows: list[dict], model_version: str) -> dict[str, Any]:
    """Measure data quality; report training drift as unavailable without a reference profile."""
    mapping = {
        "cvss_score": "cvss", "epss_score": "epss_score", "epss_percentile": "epss_percentile",
        "days_since_published": "days_since_published", "exploitability_score": "exploitability_score",
        "impact_score": "impact_score", "attack_vector": "attack_vector",
        "attack_complexity": "attack_complexity", "privileges_required": "privileges_required",
        "user_interaction": "user_interaction", "scope": "scope",
    }
    missing = {feature: 0 for feature in mapping}
    for row in rows:
        for feature, source in mapping.items():
            if row.get(source) is None:
                missing[feature] += 1
    total = len(rows)
    rates = {feature: round(count / total, 4) if total else 1.0 for feature, count in missing.items()}
    quality_status = "PASS" if total and all(rate == 0 for rate in rates.values()) else "FAIL"
    return {
        "status": "NOT_ASSESSABLE",
        "model_version": model_version,
        "assessed_at": datetime.now(timezone.utc).isoformat(),
        "row_count": total,
        "data_quality": {"status": quality_status, "missing_rate_by_feature": rates},
        "distribution_drift": {
            "status": "NOT_ASSESSABLE",
            "reason": "No hash-identified training reference distribution is shipped; PSI/KS values would be fabricated.",
        },
    }
