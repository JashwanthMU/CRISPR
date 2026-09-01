def calculate_likelihood(cvss, exploit_in_wild, patch_age_days, internet_facing, control_effectiveness, threat_intel_active) -> dict:
    try:
        from ml.incident_prediction.model import predict_incident
        
        res_cal = predict_incident(
            cvss=cvss,
            exploit_in_wild=exploit_in_wild,
            patch_age_days=patch_age_days,
            internet_facing=internet_facing,
            control_effectiveness=control_effectiveness,
            use_calibrated=True
        )
        res_uncal = predict_incident(
            cvss=cvss,
            exploit_in_wild=exploit_in_wild,
            patch_age_days=patch_age_days,
            internet_facing=internet_facing,
            control_effectiveness=control_effectiveness,
            use_calibrated=False
        )
        
        cal_avail = ("calibrated" in res_cal.get("model", "").lower() or res_cal.get("model") != "rule_based_v1_fallback")
        
        cal_prob = res_cal["probability"]
        uncal_prob = res_uncal["probability"]
        
        # XGBoost only predicts baseline vulnerability exploitability.
        # Apply organizational environmental factors (controls, exposure)
        if cal_avail:
            modifier = 1.0
            if not internet_facing:
                modifier *= 0.6
            modifier *= (1.0 - (control_effectiveness * 0.6))
            
            cal_prob *= modifier
            uncal_prob *= modifier
        
        return {
            "ranking_score": uncal_prob,
            "incident_probability": cal_prob,
            "calibration_available": cal_avail
        }
    except Exception:
        return _rule_based_likelihood_fallback(cvss, exploit_in_wild, patch_age_days, internet_facing, control_effectiveness, threat_intel_active)

def _rule_based_likelihood_fallback(cvss, exploit_in_wild, patch_age_days, internet_facing, control_effectiveness, threat_intel_active):
    score = 0.0
    score += (cvss / 10) * 0.25
    score += (0.95 if exploit_in_wild else 0.3) * 0.20
    score += min(patch_age_days / 90, 1.0) * 0.15
    score += (0.95 if internet_facing else 0.3) * 0.15
    score += (1 - control_effectiveness) * 0.15
    score += (0.85 if threat_intel_active else 0.2) * 0.10
    score = round(min(max(score, 0.02), 0.95), 3)
    return {
        "ranking_score": score,
        "incident_probability": score,
        "calibration_available": False
    }
