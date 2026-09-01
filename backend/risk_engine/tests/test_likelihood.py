from backend.risk_engine.likelihood import calculate_likelihood

def test_calibration_fallback():
    res = calculate_likelihood(
        cvss=9.0, exploit_in_wild=True, patch_age_days=10, 
        internet_facing=True, control_effectiveness=0.5, threat_intel_active=False
    )
    assert "ranking_score" in res
    assert "incident_probability" in res
    assert "calibration_available" in res
    
    # Verify values
    assert isinstance(res["ranking_score"], float)
    assert isinstance(res["incident_probability"], float)
