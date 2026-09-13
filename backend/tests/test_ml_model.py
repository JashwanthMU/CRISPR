"""
Tests for ml/incident_prediction/model.py and the portable-artifact
loading path. Run with: pytest backend/tests/test_ml_model.py -v

These are integration-style tests against the real model artifacts
(portable JSON boosters, not mocks) - the point is to catch exactly the
class of bug this project hit repeatedly during development: silent
fallback to a wrong model/wrong probability range without an error.
"""
import numpy as np
import pytest

from ml.incident_prediction.model import (
    predict_incident,
    predict_from_risk_row,
    assign_tier,
    _load_models,
    get_model_info,
)


@pytest.fixture(autouse=True)
def load_models():
    """Ensure model globals are loaded once before each test module runs."""
    _load_models()


class TestModelLoading:
    def test_artifact_checksums_match(self):
        integrity = get_model_info()["artifact_integrity"]
        assert integrity["verified"] is True
        assert all(row["matches"] for row in integrity["files"].values())

    def test_calibrated_model_loads_from_portable_artifacts(self):
        """
        Regression test for the pickle cross-platform corruption bug:
        confirms the calibrated model actually loaded (not silently
        fell back to uncalibrated or rule-based) by checking a
        known-shape prediction comes back with the calibrated model name.
        """
        result = predict_incident(
            cvss=9.8, exploit_in_wild=True, patch_age_days=21,
            internet_facing=True, control_effectiveness=0.6,
            cve_id="CVE-2024-21887", epss_score=0.99999,
        )
        assert result["model"] == "xgb_v4_calibrated (Platt)", (
            "Calibrated model did not load - check ml/incident_prediction/"
            "portable/ artifacts exist and are not corrupted. This is the "
            "exact silent-fallback failure mode this project hit before."
        )

    def test_probability_is_in_valid_range(self):
        result = predict_incident(
            cvss=9.8, exploit_in_wild=True, patch_age_days=21,
            internet_facing=True, control_effectiveness=0.6,
        )
        assert 0.0 <= result["probability"] <= 1.0


class TestCalibrationFloor:
    """
    Regression tests for the 33x floor-inflation bug: a genuinely
    near-zero-risk finding should stay near-zero, not get pushed to an
    old 0.02 floor that inflates its EAL by ~33x.
    """

    def test_low_risk_finding_is_not_floor_inflated(self):
        result = predict_incident(
            cvss=2.0, exploit_in_wild=False, patch_age_days=5,
            internet_facing=False, control_effectiveness=0.95,
        )
        assert result["probability"] < 0.05, (
            f"Low-risk finding got probability={result['probability']} - "
            "if this is exactly 0.02, the old floor-inflation bug may "
            "have regressed."
        )


class TestTierCalibrationSeparation:
    """
    Regression tests for the tier/calibration mismatch bug: displayed tier
    and probability must use the same calibrated scale.
    """

    def test_high_eal_finding_does_not_show_low_tier(self):
        # A003-like profile: high CVSS, exploited, internet-facing,
        # weak controls, high EPSS - should never tier as LOW.
        result = predict_incident(
            cvss=9.8, exploit_in_wild=True, patch_age_days=21,
            internet_facing=True, control_effectiveness=0.4,
            cve_id="CVE-2024-21887", epss_score=0.99999,
            epss_percentile=0.99988,
        )
        assert result["tier"] in ("CRITICAL", "HIGH"), (
            f"High-severity, actively-exploited finding tiered as "
            f"{result['tier']} - this is the exact calibrated-vs-raw "
            f"tier band mismatch bug from the original review."
        )

    def test_assign_tier_covers_full_probability_range(self):
        """Every probability in [0, 1] must map to some tier - no gaps."""
        for p in np.linspace(0, 1, 21):
            tier_info = assign_tier(float(p))
            assert tier_info["tier"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")

    @pytest.mark.parametrize(
        ("probability", "expected"),
        [
            (0.001, "LOW"),
            (0.0499, "LOW"),
            (0.05, "MEDIUM"),
            (0.1999, "MEDIUM"),
            (0.20, "HIGH"),
            (0.30, "HIGH"),
            (0.40, "CRITICAL"),
            (1.0, "CRITICAL"),
        ],
    )
    def test_calibrated_probability_boundaries(self, probability, expected):
        assert assign_tier(probability)["tier"] == expected

    @pytest.mark.parametrize("probability", [-0.1, 1.1, float("nan"), float("inf")])
    def test_invalid_probability_is_rejected(self, probability):
        with pytest.raises(ValueError):
            assign_tier(probability)


class TestPredictFromRiskRow:
    def test_numeric_categorical_encodings_from_enrichment_are_preserved(self):
        result = predict_from_risk_row({
            "cvss": 9.8,
            "epss_score": 0.99,
            "epss_percentile": 0.99,
            "attack_vector": 0,
            "attack_complexity": 0,
            "privileges_required": 2,
            "user_interaction": 0,
            "scope": 1,
        })
        assert result["model"] == "xgb_v4_calibrated (Platt)"
        assert result["probability"] is not None

    def test_handles_missing_optional_fields_gracefully(self):
        """
        None values for enrichment fields (EPSS, CVSS vector, CWE flags)
        must not crash - predict_incident should fall back to its own
        defaults, never a fabricated substitute.
        """
        result = predict_from_risk_row({
            "cvss": 7.5,
            "exploit_in_wild": False,
            "patch_age_days": 30,
            "internet_facing": False,
            "control_effectiveness_pct": 50.0,
            "cve_id": None,
            "epss_score": None,
            "days_since_published": None,
            "flag_rce": None,
        })
        assert result is not None
        assert result["model"] == "xgb_v4_calibrated (Platt)"

    def test_error_fallback_on_malformed_input(self):
        """Malformed input is explicit and never manufactures probability."""
        result = predict_from_risk_row({"cvss": "not-a-number"})
        assert result["model"] == "invalid_input"
        assert result["probability"] is None

    def test_out_of_range_input_is_rejected(self):
        result = predict_from_risk_row({"cvss": 999.0})
        assert result["model"] == "invalid_input"
        assert result["probability"] is None

    def test_invalid_encoded_category_is_rejected(self):
        with pytest.raises(ValueError):
            predict_incident(
                cvss=7.0,
                exploit_in_wild=False,
                patch_age_days=10,
                internet_facing=False,
                control_effectiveness=0.5,
                attack_vector=99,
            )


class TestNoSyntheticInputs:
    def test_exploit_flag_does_not_invent_epss(self):
        result = predict_incident(
            cvss=9.8,
            exploit_in_wild=True,
            patch_age_days=21,
            internet_facing=True,
            control_effectiveness=0.5,
        )
        assert result["epss_score"] == 0.0
        assert result["input_provenance"]["epss"].startswith("missing")

    def test_probability_semantics_do_not_claim_annual_incident_rate(self):
        result = predict_incident(
            cvss=9.8,
            exploit_in_wild=True,
            patch_age_days=21,
            internet_facing=True,
            control_effectiveness=0.5,
            epss_score=0.99,
            epss_percentile=0.99,
        )
        assert "not an annual incident probability" in result["probability_semantics"]


class TestExplainability:
    def test_default_call_has_no_contributions(self):
        """explain=False (the default) must stay fast - no SHAP computed."""
        result = predict_incident(
            cvss=9.8, exploit_in_wild=True, patch_age_days=21,
            internet_facing=True, control_effectiveness=0.6,
        )
        assert result["contributions"] is None

    def test_explain_true_returns_real_shap_contributions(self):
        result = predict_incident(
            cvss=9.8, exploit_in_wild=True, patch_age_days=21,
            internet_facing=True, control_effectiveness=0.6,
            cve_id="CVE-2024-21887", epss_score=0.99999, explain=True,
        )
        contributions = result["contributions"]
        assert contributions is not None
        assert len(contributions["top_contributors"]) == 5
        for c in contributions["top_contributors"]:
            assert "feature" in c and "shap_value" in c
        assert "raw XGBoost ranking score" in contributions["note"]
