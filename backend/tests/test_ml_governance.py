from ml.incident_prediction.governance import assess_live_data, validate_runtime, verify_artifacts


def test_generic_job_status_is_not_limited_to_risk_analysis_jobs():
    from pathlib import Path

    source = Path("backend/app/api/analysis.py").read_text()
    assert "job_type='risk.analysis'" not in source
    assert "job_type,status,result" in source


def test_shipped_model_artifacts_match_governance_manifest():
    result = verify_artifacts()
    assert result["status"] == "PASS"
    assert len(result["files"]) >= 10


def test_runtime_validation_is_honest_about_allowed_use():
    result = validate_runtime()
    assert result["status"] == "PASS"
    assert result["metric_reproducibility"]["status"] == "NOT_ASSESSABLE"
    assert result["metric_reproducibility"]["metadata_metrics_are_evidence"] is False
    assert result["financial_use"]["status"] == "NOT_APPROVED"
    assert "CVE prioritization" in result["approved_uses"]


def test_drift_is_not_fabricated_without_training_reference_profile():
    report = assess_live_data([{
        "cvss": 8.8, "epss_score": 0.01, "epss_percentile": 0.5,
        "days_since_published": 5, "exploitability_score": 2.8,
        "impact_score": 5.9, "attack_vector": 0, "attack_complexity": 0,
        "privileges_required": 0, "user_interaction": 1, "scope": 0,
    }], "xgb_v4_final")
    assert report["data_quality"]["status"] == "PASS"
    assert report["distribution_drift"]["status"] == "NOT_ASSESSABLE"


def test_data_quality_fails_when_required_live_fields_are_missing():
    report = assess_live_data([{"cvss": 8.8}], "xgb_v4_final")
    assert report["data_quality"]["status"] == "FAIL"
    assert report["data_quality"]["missing_rate_by_feature"]["epss_score"] == 1.0
