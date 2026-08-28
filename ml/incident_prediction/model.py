"""
CRISPR - Incident Likelihood Model V4
Replaces rule-based V1 (ml/incident_prediction/model.py)

Two models:
  final_model      - uncalibrated XGBoost (for CVE ranking)
  calibrated_model - Platt-scaled (for ₹ EAL calculation)

Authors: Jashwanth M U (@JashwanthMU) and Christ Michael Jeniston S (@Kira-007)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import numpy as np

MODEL_DIR = Path(__file__).parent

# Lazy-loaded globals — loaded once on first call, not at import time
_xgb_model        = None
_calib_model      = None
_config           = None
_feature_list     = None
_probability_bands = None  # NEW — loaded from model_config.json

# CERT-In flagged CVEs — India signal
# Full list maintained in ml/data/cert_in_cves.json
_CERT_IN_PATH = MODEL_DIR.parent / "data" / "cert_in_cves.json"
_cert_in_set: Optional[set] = None

# Fallback bands — used only if model_config.json doesn't have probability_bands
# (e.g. older model artifact). Keep in sync with the training notebook's
# PROBABILITY_BANDS constant.
_DEFAULT_BANDS = [
    {"min": 0.90, "max": 1.00, "tier": "CRITICAL", "action": "Immediate remediation"},
    {"min": 0.70, "max": 0.90, "tier": "HIGH",      "action": "High priority — schedule within days"},
    {"min": 0.40, "max": 0.70, "tier": "MEDIUM",    "action": "Security review"},
    {"min": 0.00, "max": 0.40, "tier": "LOW",       "action": "Monitor"},
]


def _load_cert_in() -> set:
    global _cert_in_set
    if _cert_in_set is None:
        if _CERT_IN_PATH.exists():
            with _CERT_IN_PATH.open() as f:
                _cert_in_set = set(json.load(f))
        else:
            _cert_in_set = {
                "CVE-2024-21762", "CVE-2024-21887", "CVE-2024-3400",
                "CVE-2024-1708",  "CVE-2024-20767", "CVE-2024-21338",
                "CVE-2025-0282",  "CVE-2025-21333", "CVE-2025-21334",
                "CVE-2025-29824", "CVE-2025-30397", "CVE-2025-32701",
            }
    return _cert_in_set


def _load_models():
    """Load XGBoost model and config on first inference call."""
    global _xgb_model, _calib_model, _config, _feature_list, _probability_bands

    if _xgb_model is not None:
        return  # already loaded

    xgb_path    = MODEL_DIR / "crispr_xgb_model.json"
    calib_path  = MODEL_DIR / "crispr_xgb_calibrated.pkl"
    config_path = MODEL_DIR / "model_config.json"

    if xgb_path.exists():
        try:
            import xgboost as xgb
            _xgb_model = xgb.XGBClassifier()
            _xgb_model.load_model(xgb_path)
        except Exception as e:
            print(f"Warning: XGBoost model load failed: {e}")
            _xgb_model = None

    if calib_path.exists():
        try:
            import joblib
            _calib_model = joblib.load(calib_path)
        except Exception as e:
            print(f"Warning: Calibrated model load failed: {e}")
            _calib_model = None

    if config_path.exists():
        with config_path.open() as f:
            _config = json.load(f)
        _feature_list = _config.get("features", [])
        _probability_bands = _config.get("probability_bands", _DEFAULT_BANDS)
    else:
        _probability_bands = _DEFAULT_BANDS

    if _xgb_model is None:
        print("Note: XGBoost model not found — using rule-based V1 fallback")


def assign_tier(probability: float) -> dict:
    """
    Map a continuous probability to a CRISPR priority tier + recommended action.
    Bands come from model_config.json (probability_bands), so retraining or
    re-tuning bands doesn't require a code change here — just re-run Cell 22.
    """
    bands = _probability_bands or _DEFAULT_BANDS
    for band in bands:
        lo, hi = band["min"], band["max"]
        if lo <= probability < hi or (probability >= hi and hi == 1.00):
            return {"tier": band["tier"], "action": band["action"]}
    # Fallback — should not normally hit this if bands cover [0, 1] fully
    return {"tier": "LOW", "action": "Monitor"}


def _rule_based_fallback(
    cvss: float,
    exploit_in_wild: bool,
    patch_age_days: int,
    internet_facing: bool,
    control_effectiveness: float,
) -> float:
    """
    V1 rule-based model — used when XGBoost model is not available.
    Kept here for backward compatibility and graceful degradation.
    """
    score  = (cvss / 10.0) * 0.25
    score += (0.95 if exploit_in_wild   else 0.30) * 0.20
    score += min(patch_age_days / 90, 1.0)         * 0.15
    score += (0.95 if internet_facing   else 0.30) * 0.15
    score += (1 - control_effectiveness)            * 0.15
    score += 0.20 * 0.10  # base threat intel signal
    return round(min(max(score, 0.02), 0.95), 3)


def _build_feature_vector(
    cvss_score:           float,
    epss_score:           float,
    epss_percentile:      float,
    days_since_published: int,
    severity_encoded:     int,
    is_cert_in:           int,
    attack_vector:        int,
    attack_complexity:    int,
    privileges_required:  int,
    user_interaction:     int,
    scope:                int,
    exploitability_score: float,
    impact_score:         float,
    flag_rce:             int,
    flag_sqli:            int,
    flag_xss:             int,
    flag_buffer_overflow: int,
    flag_priv_escalation: int,
    flag_dos:             int,
    flag_dir_traversal:   int,
) -> dict:
    return {
        'cvss_score':            cvss_score,
        'epss_score':            epss_score,
        'epss_percentile':       epss_percentile,
        'days_since_published':  days_since_published,
        'severity_encoded':      severity_encoded,
        'is_cert_in':            is_cert_in,
        'attack_vector':         attack_vector,
        'attack_complexity':     attack_complexity,
        'privileges_required':   privileges_required,
        'user_interaction':      user_interaction,
        'scope':                 scope,
        'exploitability_score':  exploitability_score,
        'impact_score':          impact_score,
        'flag_rce':              flag_rce,
        'flag_sqli':             flag_sqli,
        'flag_xss':              flag_xss,
        'flag_buffer_overflow':  flag_buffer_overflow,
        'flag_priv_escalation':  flag_priv_escalation,
        'flag_dos':              flag_dos,
        'flag_dir_traversal':    flag_dir_traversal,
    }


def predict_incident(
    cvss:                  float,
    exploit_in_wild:       bool,
    patch_age_days:        int,
    internet_facing:       bool,
    control_effectiveness: float,
    # Extended features (from NVD enrichment — use defaults if not available)
    cve_id:                Optional[str] = None,
    epss_score:            float = 0.0,
    epss_percentile:       float = 0.0,
    days_since_published:  int   = 30,
    exploitability_score:  float = 0.0,
    impact_score:          float = 0.0,
    flag_rce:              int   = 0,
    flag_sqli:             int   = 0,
    flag_xss:              int   = 0,
    flag_buffer_overflow:  int   = 0,
    flag_priv_escalation:  int   = 0,
    flag_dos:              int   = 0,
    flag_dir_traversal:    int   = 0,
    attack_vector:         int   = -1,  # -1 = unknown
    attack_complexity:     int   = -1,
    privileges_required:   int   = -1,
    user_interaction:      int   = -1,
    scope:                 int   = -1,
    use_calibrated:        bool  = True,  # True for ₹ EAL; False for ranking
) -> dict:
    """
    Predict exploitation likelihood for a CVE.

    Returns:
        probability:   float 0.02–0.95 — feeds into FAIR EAL calculation
        tier:          CRITICAL / HIGH / MEDIUM / LOW — from probability_bands
        action:        recommended next step for that tier
        model_used:    which model produced the output
        is_cert_in:    whether CVE appears in CERT-In advisories (India signal)
        contributions: dict of weighted feature contributions (rule-based fallback only)

    NOTE: CRISPR does not gate on a single binary threshold. Recall@K analysis
    (see docs/ml/recall_at_k.csv) showed a single cutoff trades recall for
    precision sharply — at K=500 ranked candidates, the model surfaces 60.7%
    of confirmed exploits; at K=1000, 73.3%. The tier bands below are the
    production-facing decision surface; the raw probability is preserved for
    ranking and EAL calculation.
    """
    _load_models()
    cert_in_set = _load_cert_in()

    # India signal: check CERT-In
    is_cert_in_flag = 1 if (cve_id and cve_id.upper() in cert_in_set) else 0

    # Severity encoding from CVSS
    severity_encoded = (
        4 if cvss >= 9.0 else
        3 if cvss >= 7.0 else
        2 if cvss >= 4.0 else
        1
    )

    # If exploit_in_wild is known but epss_score not passed, approximate it
    if epss_score == 0.0 and exploit_in_wild:
        epss_score      = 0.70
        epss_percentile = 0.97

    # ── Try XGBoost model ────────────────────────────────────────
    model_to_use = _calib_model if (use_calibrated and _calib_model) else _xgb_model

    if model_to_use is not None and _feature_list:
        feature_dict = _build_feature_vector(
            cvss_score=cvss, epss_score=epss_score,
            epss_percentile=epss_percentile,
            days_since_published=days_since_published,
            severity_encoded=severity_encoded,
            is_cert_in=is_cert_in_flag,
            attack_vector=attack_vector, attack_complexity=attack_complexity,
            privileges_required=privileges_required,
            user_interaction=user_interaction, scope=scope,
            exploitability_score=exploitability_score, impact_score=impact_score,
            flag_rce=flag_rce, flag_sqli=flag_sqli, flag_xss=flag_xss,
            flag_buffer_overflow=flag_buffer_overflow,
            flag_priv_escalation=flag_priv_escalation,
            flag_dos=flag_dos, flag_dir_traversal=flag_dir_traversal,
        )

        # Build feature vector in training order (critical — must match training)
        X = [[feature_dict.get(f, 0) for f in _feature_list]]

        try:
            X_arr = np.array(X, dtype=float)
            prob  = float(model_to_use.predict_proba(X_arr)[0][1])
            prob  = max(0.02, min(0.95, prob))
            tier_info = assign_tier(prob)

            model_name = (
                "xgb_v4_calibrated (Platt)" if use_calibrated and _calib_model
                else "xgb_v4_uncalibrated"
            )

            return {
                "probability":   round(prob, 3),
                "tier":          tier_info["tier"],
                "action":        tier_info["action"],
                "model":         model_name,
                "model_version": _config.get("model_version", "xgb_v4") if _config else "xgb_v4",
                "is_cert_in":    bool(is_cert_in_flag),
                "epss_score":    epss_score,
                "contributions": None,  # SHAP on-demand — not computed here for speed
            }
        except Exception as e:
            print(f"XGBoost inference error: {e} — falling back to rule-based")

    # ── Fallback: rule-based V1 ──────────────────────────────────
    prob = _rule_based_fallback(
        cvss=cvss, exploit_in_wild=exploit_in_wild,
        patch_age_days=patch_age_days, internet_facing=internet_facing,
        control_effectiveness=control_effectiveness,
    )

    # CERT-In boost: +10% probability for India-active CVEs (capped at 0.95)
    if is_cert_in_flag:
        prob = min(prob * 1.10, 0.95)

    tier_info = assign_tier(prob)

    return {
        "probability":   round(prob, 3),
        "tier":          tier_info["tier"],
        "action":        tier_info["action"],
        "model":         "rule_based_v1_fallback",
        "model_version": "v1",
        "is_cert_in":    bool(is_cert_in_flag),
        "epss_score":    epss_score,
        "contributions": {
            "cvss_severity":    round((cvss / 10.0) * 0.25, 3),
            "exploit_activity": round((0.95 if exploit_in_wild else 0.30) * 0.20, 3),
            "patch_lag":        round(min(patch_age_days / 90, 1.0) * 0.15, 3),
            "network_exposure": round((0.95 if internet_facing else 0.30) * 0.15, 3),
            "control_gap":      round((1 - control_effectiveness) * 0.15, 3),
            "cert_in_boost":    round(0.10 if is_cert_in_flag else 0.0, 3),
        },
    }


def predict_from_risk_row(risk_row: dict) -> Optional[dict]:
    """
    Convenience wrapper: build predict_incident() call from a risk engine row.
    Used by backend/app/api/risks.py to get probability for each DEMO_RISK_INPUT.
    """
    try:
        return predict_incident(
            cvss=float(risk_row.get("cvss", 7.5)),
            exploit_in_wild=bool(risk_row.get("exploit_in_wild", False)),
            patch_age_days=int(risk_row.get("patch_age_days", 30)),
            internet_facing=bool(risk_row.get("internet_facing", False)),
            control_effectiveness=float(
                risk_row.get("control_effectiveness_pct", 50.0)
            ) / 100.0,
            cve_id=risk_row.get("cve_id"),
            epss_score=float(risk_row.get("epss_score", 0.0)),
        )
    except (TypeError, ValueError, KeyError) as e:
        return {"probability": 0.1, "tier": "LOW", "action": "Monitor",
                "model": "error_fallback", "error": str(e)}


def get_model_info() -> dict:
    """Return model metadata — used by /api/health and /api/assistant."""
    _load_models()
    if _config:
        return {
            "model_version":    _config.get("model_version"),
            "trained_on":       _config.get("trained_on"),
            "pr_auc":           _config.get("metrics", {}).get(
                                 "stratified_random_split", {}).get("pr_auc"),
            "recall_at_k":      _config.get("recall_at_k"),
            "probability_bands":_config.get("probability_bands", _DEFAULT_BANDS),
            "features":         _feature_list,
            "india_signal":     "CERT-In advisory flag (is_cert_in)",
            "calibrated":       (MODEL_DIR / "crispr_xgb_calibrated.pkl").exists(),
            "known_limitations":_config.get("known_limitations", []),
        }
    return {"model_version": "rule_based_v1", "trained_on": None}