import math
from backend.data_access import LiveDataUnavailable, demo_mode_enabled


def _extend_exposure_probability(probability: float, extra_days: int) -> float:
    """Compound a probability over an explicitly longer exposure window.

    This does not claim that patch age is an XGBoost feature. It answers the
    narrower scenario question: if the current hazard remains constant, what
    is the probability across one year plus ``extra_days`` of exposure?
    """
    if extra_days < 0:
        raise ValueError("patch_delay_days cannot be negative")
    if extra_days == 0 or probability in (0.0, 1.0):
        return probability
    return 1.0 - math.pow(1.0 - probability, 1.0 + extra_days / 365.0)


def calculate_likelihood(
    cvss,
    exploit_in_wild,
    patch_age_days,
    internet_facing,
    control_effectiveness,
    threat_intel_active,
    patch_delay_days=0,
    model_features=None,
) -> dict:
    try:
        from ml.incident_prediction.model import predict_incident
        
        model_features = model_features or {}
        shared_model_inputs = {
            "cve_id": model_features.get("cve") or model_features.get("cve_id"),
            "epss_score": float(model_features.get("epss_score") or 0.0),
            "epss_percentile": float(model_features.get("epss_percentile") or 0.0),
            "days_since_published": int(model_features.get("days_since_published") or 30),
            "exploitability_score": float(model_features.get("exploitability_score") or 0.0),
            "impact_score": float(model_features.get("impact_score") or 0.0),
            "flag_rce": int(model_features.get("flag_rce") or 0),
            "flag_sqli": int(model_features.get("flag_sqli") or 0),
            "flag_xss": int(model_features.get("flag_xss") or 0),
            "flag_buffer_overflow": int(model_features.get("flag_buffer_overflow") or 0),
            "flag_priv_escalation": int(model_features.get("flag_priv_escalation") or 0),
            "flag_dos": int(model_features.get("flag_dos") or 0),
            "flag_dir_traversal": int(model_features.get("flag_dir_traversal") or 0),
            "attack_vector": int(model_features.get("attack_vector", -1) if model_features.get("attack_vector") is not None else -1),
            "attack_complexity": int(model_features.get("attack_complexity", -1) if model_features.get("attack_complexity") is not None else -1),
            "privileges_required": int(model_features.get("privileges_required", -1) if model_features.get("privileges_required") is not None else -1),
            "user_interaction": int(model_features.get("user_interaction", -1) if model_features.get("user_interaction") is not None else -1),
            "scope": int(model_features.get("scope", -1) if model_features.get("scope") is not None else -1),
        }
        res_cal = predict_incident(
            cvss=cvss,
            exploit_in_wild=exploit_in_wild,
            patch_age_days=patch_age_days,
            internet_facing=internet_facing,
            control_effectiveness=control_effectiveness,
            use_calibrated=True,
            **shared_model_inputs,
        )
        res_uncal = predict_incident(
            cvss=cvss,
            exploit_in_wild=exploit_in_wild,
            patch_age_days=patch_age_days,
            internet_facing=internet_facing,
            control_effectiveness=control_effectiveness,
            use_calibrated=False,
            **shared_model_inputs,
        )
        
        cal_avail = res_cal.get("model") == "xgb_v4_calibrated (Platt)"
        if not cal_avail and not demo_mode_enabled():
            raise LiveDataUnavailable("Calibrated ML artifact is unavailable; rule-based likelihood refused in live mode")
        
        cal_prob = res_cal["probability"]
        uncal_prob = res_uncal["probability"]
        
        # XGBoost predicts KEV membership from public vulnerability features.
        # The environmental modifier is a separate, visible CRISPR assumption;
        # it must never be described as a feature learned by XGBoost.
        modifier = 1.0
        if cal_avail:
            if not internet_facing:
                modifier *= 0.6
            modifier *= (1.0 - (control_effectiveness * 0.6))

            cal_prob = min(max(cal_prob * modifier, 0.0), 1.0)
            uncal_prob = min(max(uncal_prob * modifier, 0.0), 1.0)

        before_delay = cal_prob
        cal_prob = _extend_exposure_probability(cal_prob, int(patch_delay_days))
        
        return {
            "ranking_score": uncal_prob,
            "incident_probability": cal_prob,
            "calibration_available": cal_avail,
            "likelihood_semantics": "annualized CRISPR proxy; model component is calibrated KEV-membership likelihood",
            "calculation": {
                "model_probability": res_cal.get("probability"),
                "model_probability_semantics": res_cal.get("probability_semantics"),
                "internet_exposure_multiplier": 1.0 if internet_facing else 0.6,
                "control_multiplier": 1.0 - (control_effectiveness * 0.6),
                "combined_environment_multiplier": modifier,
                "probability_before_delay": before_delay,
                "patch_delay_days": int(patch_delay_days),
                "delay_formula": "1 - (1 - p) ** (1 + delay_days / 365)",
            },
        }
    except LiveDataUnavailable:
        raise
    except Exception:
        if not demo_mode_enabled():
            raise
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
