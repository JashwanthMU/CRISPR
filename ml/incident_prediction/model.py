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
import math
import hashlib
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
_shap_explainer    = None  # NEW — lazy-loaded, None until first explain_prediction() call

# CERT-In flagged CVEs — India signal
# Full list maintained in ml/data/cert_in_cves.json
_CERT_IN_PATH = MODEL_DIR.parent / "data" / "cert_in_cves.json"
_cert_in_set: Optional[set] = None

# Fallback bands — used only if model_config.json doesn't have probability_bands
# (e.g. older model artifact). Keep in sync with the training notebook's
# PROBABILITY_BANDS constant.
_DEFAULT_BANDS = [
    # These bands are for the Platt-calibrated model output. They are decision
    # policy thresholds, not claims about CVSS severity or annual loss.
    {"min": 0.40, "max": 1.00, "tier": "CRITICAL", "action": "Immediate remediation"},
    {"min": 0.20, "max": 0.40, "tier": "HIGH",      "action": "High priority — schedule within days"},
    {"min": 0.05, "max": 0.20, "tier": "MEDIUM",    "action": "Security review"},
    {"min": 0.00, "max": 0.05, "tier": "LOW",       "action": "Monitor"},
]


def _load_cert_in() -> set:
    global _cert_in_set
    if _cert_in_set is None:
        if _CERT_IN_PATH.exists():
            # utf-8-sig strips a UTF-8 BOM if present, and is a no-op if not -
            # the source file was saved with a BOM (e.g. by Excel/PowerShell)
            # which crashes plain utf-8 json.load()
            with _CERT_IN_PATH.open(encoding="utf-8-sig") as f:
                _cert_in_set = set(json.load(f))
        else:
            _cert_in_set = {
                "CVE-2024-21762", "CVE-2024-21887", "CVE-2024-3400",
                "CVE-2024-1708",  "CVE-2024-20767", "CVE-2024-21338",
                "CVE-2025-0282",  "CVE-2025-21333", "CVE-2025-21334",
                "CVE-2025-29824", "CVE-2025-30397", "CVE-2025-32701",
            }
    return _cert_in_set


class PortableCalibratedModel:
    """
    Drop-in replacement for the pickled CalibratedClassifierCV, built from
    portable artifacts (per-fold XGBoost boosters in native JSON format +
    plain-float Platt/sigmoid calibration coefficients) instead of a raw
    pickled buffer.

    Why this exists: crispr_xgb_calibrated.pkl embeds XGBoost's internal
    C++ buffer via pickle, which is not guaranteed portable across
    platforms/builds - confirmed failing with
    "XGBoostError: input stream corrupted" on at least one Windows machine
    despite an identical (SHA256-verified) file and identical xgboost/
    sklearn/joblib versions to a machine where it loads fine. XGBoost's own
    docs recommend Booster.save_model() (portable JSON/UBJ) over pickle for
    exactly this reason.

    Numerically verified equivalent to the original pickle's predict_proba
    output (max abs diff ~1.9e-08, i.e. floating-point noise) - see
    tools/export_portable_model.py for the export + verification script.
    """

    def __init__(self, manifest: dict, portable_dir: Path):
        import xgboost as xgb
        self.feature_names = None  # set from model_config.json by caller
        self.folds = []
        for fold in manifest["folds"]:
            booster = xgb.Booster()
            booster.load_model(str(portable_dir / fold["booster_file"]))
            self.folds.append((booster, fold["sigmoid_a"], fold["sigmoid_b"]))

    @staticmethod
    def _sigmoid_calibrate(raw_score, a, b):
        return 1.0 / (1.0 + np.exp(a * raw_score + b))

    def predict_proba(self, X):
        import xgboost as xgb
        dmatrix = xgb.DMatrix(np.asarray(X, dtype=float), feature_names=self.feature_names)
        fold_preds = [
            self._sigmoid_calibrate(booster.predict(dmatrix), a, b)
            for booster, a, b in self.folds
        ]
        prob_class_1 = np.mean(fold_preds, axis=0)
        # Match sklearn's predict_proba shape: (n_samples, 2)
        return np.column_stack([1 - prob_class_1, prob_class_1])


def _load_models():
    """Load XGBoost model and config on first inference call."""
    global _xgb_model, _calib_model, _config, _feature_list, _probability_bands

    if _xgb_model is not None:
        return  # already loaded

    xgb_path      = MODEL_DIR / "crispr_xgb_model.json"
    calib_path    = MODEL_DIR / "crispr_xgb_calibrated.pkl"
    portable_dir  = MODEL_DIR / "portable"
    manifest_path = portable_dir / "manifest.json"
    config_path   = MODEL_DIR / "model_config.json"

    checksum_path = MODEL_DIR / "artifact_checksums.json"
    expected_checksums = {}
    try:
        expected_checksums = json.loads(checksum_path.read_text(encoding="utf-8")).get("files", {})
    except (OSError, ValueError, TypeError):
        pass

    def integrity_ok(relative_path: str) -> bool:
        expected = expected_checksums.get(relative_path)
        path = MODEL_DIR / relative_path
        if not expected or not path.is_file():
            return False
        return hashlib.sha256(path.read_bytes()).hexdigest() == expected

    if integrity_ok("crispr_xgb_model.json"):
        try:
            import xgboost as xgb
            _xgb_model = xgb.XGBClassifier()
            _xgb_model.load_model(xgb_path)
        except Exception as e:
            print(f"Warning: XGBoost model load failed: {e}")
            _xgb_model = None

    # Prefer the portable reconstruction (immune to the pickle
    # cross-platform issue); fall back to the legacy pickle only if the
    # portable artifacts haven't been generated yet.
    portable_files = ["portable/manifest.json"]
    if manifest_path.exists():
        try:
            portable_files.extend(
                f"portable/{row['booster_file']}"
                for row in json.loads(manifest_path.read_text(encoding="utf-8")).get("folds", [])
            )
        except (OSError, ValueError, TypeError, KeyError):
            portable_files = []
    if portable_files and all(integrity_ok(path) for path in portable_files):
        try:
            manifest = json.load(manifest_path.open())
            _calib_model = PortableCalibratedModel(manifest, portable_dir)
            print("Loaded calibrated model from portable artifacts (not pickle).")
        except Exception as e:
            print(f"Warning: Portable calibrated model load failed: {e}")
            _calib_model = None
    elif integrity_ok("crispr_xgb_calibrated.pkl"):
        try:
            import joblib
            _calib_model = joblib.load(calib_path)
        except Exception as e:
            print(f"Warning: Calibrated model load failed: {e}")
            _calib_model = None

    if integrity_ok("model_config.json"):
        with config_path.open() as f:
            _config = json.load(f)
        _feature_list = _config.get("features", [])
        _probability_bands = _config.get("probability_bands", _DEFAULT_BANDS)
        if _calib_model is not None and hasattr(_calib_model, "feature_names"):
            _calib_model.feature_names = _feature_list
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
    if isinstance(probability, bool) or not isinstance(probability, (int, float)):
        raise TypeError("probability must be a real number")
    probability = float(probability)
    if not math.isfinite(probability) or not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be finite and between 0 and 1")
    _load_models()
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


def _get_shap_explainer():
    """Lazy-load a SHAP TreeExplainer against the raw ranking booster.

    TreeExplainer explains the uncalibrated ranking model. It does not explain
    the five-fold Platt ensemble's final calibrated probability; that limitation
    is disclosed in every returned explanation.
    """
    global _shap_explainer
    if _shap_explainer is not None:
        return _shap_explainer
    if _xgb_model is None:
        return None
    try:
        import shap
        _shap_explainer = shap.TreeExplainer(_xgb_model.get_booster())
    except Exception as e:
        print(f"Warning: SHAP explainer init failed: {e}")
        _shap_explainer = False  # sentinel: don't retry every call
    return _shap_explainer if _shap_explainer else None


def explain_prediction(feature_dict: dict) -> Optional[dict]:
    """
    Per-prediction SHAP contributions for a single finding - answers
    "why did the model say this" for one specific CVE, as opposed to the
    global SHAP summary in docs/ml/shap_summary.png which only shows
    average feature importance across the whole training set.

    Returns None (not a fabricated explanation) if SHAP or the model
    isn't available - callers should treat this as optional enrichment,
    not a guaranteed field.
    """
    _load_models()
    explainer = _get_shap_explainer()
    if explainer is None or not _feature_list:
        return None
    try:
        X = np.array([[feature_dict.get(f, 0) for f in _feature_list]], dtype=float)
        shap_values = explainer.shap_values(X)[0]
        contributions = sorted(
            zip(_feature_list, shap_values.tolist()),
            key=lambda pair: abs(pair[1]),
            reverse=True,
        )
        return {
            "top_contributors": [
                {"feature": f, "shap_value": round(v, 4)} for f, v in contributions[:5]
            ],
            "base_value": round(float(explainer.expected_value), 4),
            "note": "Explains the raw XGBoost ranking score, not the final "
                    "five-fold Platt-calibrated probability.",
        }
    except Exception as e:
        print(f"SHAP explanation failed: {e}")
        return None


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
    explain:               bool  = False,  # True to compute per-prediction SHAP (slower)
) -> dict:
    """
    Predict exploitation likelihood for a CVE.

    Returns:
        probability:   calibrated KEV-membership likelihood in [0, 1]
        tier:          CRITICAL / HIGH / MEDIUM / LOW — from probability_bands
        action:        recommended next step for that tier
        model_used:    which model produced the output
        is_cert_in:    whether CVE appears in CERT-In advisories (India signal)
        contributions: dict of weighted feature contributions (rule-based fallback only)

    NOTE: CRISPR does not gate on a single binary threshold. Recall@K analysis
    (see docs/ml/recall_at_k.csv) showed a single cutoff trades recall for
    precision sharply — at K=500 ranked candidates, the model surfaces 60.7%
    of confirmed exploits; at K=1000, 73.3%. The tier bands below are the
    production-facing decision surface. The raw score is preserved separately
    for ranking. Neither output is silently relabelled as an annual frequency.
    """
    numeric_ranges = {
        "cvss": (cvss, 0.0, 10.0),
        "patch_age_days": (patch_age_days, 0, 36500),
        "control_effectiveness": (control_effectiveness, 0.0, 1.0),
        "epss_score": (epss_score, 0.0, 1.0),
        "epss_percentile": (epss_percentile, 0.0, 1.0),
        "days_since_published": (days_since_published, 0, 36500),
    }
    for name, (value, minimum, maximum) in numeric_ranges.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise TypeError(f"{name} must be a real number")
        if not math.isfinite(float(value)) or not minimum <= float(value) <= maximum:
            raise ValueError(f"{name} must be between {minimum} and {maximum}")
    if not isinstance(exploit_in_wild, bool) or not isinstance(internet_facing, bool):
        raise TypeError("exploit_in_wild and internet_facing must be booleans")
    categorical_ranges = {
        "attack_vector": (attack_vector, {-1, 0, 1, 2, 3}),
        "attack_complexity": (attack_complexity, {-1, 0, 1}),
        "privileges_required": (privileges_required, {-1, 0, 1, 2}),
        "user_interaction": (user_interaction, {-1, 0, 1}),
        "scope": (scope, {-1, 0, 1}),
    }
    for name, (value, allowed) in categorical_ranges.items():
        if isinstance(value, bool) or value not in allowed:
            raise ValueError(f"{name} must be one of {sorted(allowed)}")
    binary_flags = {
        "flag_rce": flag_rce,
        "flag_sqli": flag_sqli,
        "flag_xss": flag_xss,
        "flag_buffer_overflow": flag_buffer_overflow,
        "flag_priv_escalation": flag_priv_escalation,
        "flag_dos": flag_dos,
        "flag_dir_traversal": flag_dir_traversal,
    }
    for name, value in binary_flags.items():
        if isinstance(value, bool) or value not in (0, 1):
            raise ValueError(f"{name} must be 0 or 1")

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

            if use_calibrated:
                # Calibrated probability feeds directly into EAL (rupees), so
                # a 0.02 floor would inflate a genuinely near-zero-risk
                # finding's dollar exposure by up to ~33x (0.0006 -> 0.02).
                # Preserve genuine zero/one probabilities. A non-zero floor
                # manufactures financial exposure and is not statistically
                # justified by the trained artifact.
                prob = max(0.0, min(1.0, prob))
            else:
                # Raw/uncalibrated score is used for ranking only, never for
                # a rupee figure - a 0.02 floor here just keeps every CVE
                # sortable and doesn't distort a financial number.
                prob = max(0.02, min(0.95, prob))

            # The displayed tier and displayed probability must share the
            # same scale. Mixing a raw-model tier with a calibrated number is
            # misleading and caused 30% calibrated probabilities to be LOW.
            tier_info = assign_tier(prob)
            raw_prob = (
                float(_xgb_model.predict_proba(X_arr)[0][1])
                if _xgb_model is not None
                else None
            )

            model_name = (
                "xgb_v4_calibrated (Platt)" if use_calibrated and _calib_model
                else "xgb_v4_uncalibrated"
            )

            return {
                "probability":   round(prob, 4),
                "ranking_score": round(raw_prob, 4) if raw_prob is not None else None,
                "tier":          tier_info["tier"],
                "action":        tier_info["action"],
                "model":         model_name,
                "model_version": _config.get("model_version", "xgb_v4") if _config else "xgb_v4",
                "is_cert_in":    bool(is_cert_in_flag),
                "epss_score":    epss_score,
                "probability_semantics": "calibrated KEV-membership likelihood; not an annual incident probability",
                "input_provenance": {
                    "epss": "caller supplied" if epss_score > 0 else "missing (zero; no synthetic substitution)",
                    "exploit_in_wild_used_by_model": False,
                    "internet_facing_used_by_model": False,
                    "control_effectiveness_used_by_model": False,
                    "patch_age_days_used_by_model": False,
                },
                "contributions": explain_prediction(feature_dict) if explain else None,
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
    Full-feature wrapper: consumes all enriched NVD/EPSS fields from
    risks.py, not just the 6 original fields.
    """
    try:
        # Encode categorical string fields to int codes
        # (must match training encoding: NETWORK→0, ADJACENT→1, LOCAL→2, PHYSICAL→3)
        av_map  = {"NETWORK": 0, "ADJACENT": 1, "LOCAL": 2, "PHYSICAL": 3}
        ac_map  = {"LOW": 0, "HIGH": 1}
        pr_map  = {"NONE": 0, "LOW": 1, "HIGH": 2}
        ui_map  = {"NONE": 0, "REQUIRED": 1}
        sc_map  = {"UNCHANGED": 0, "CHANGED": 1}

        def encode(val, mapping, default=-1):
            if val is None:
                return default
            if isinstance(val, int) and not isinstance(val, bool):
                return val if val in mapping.values() else default
            return mapping.get(str(val).upper(), default)

        return predict_incident(
            cvss=float(risk_row.get("cvss", 7.5)),
            exploit_in_wild=bool(risk_row.get("exploit_in_wild", False)),
            patch_age_days=int(risk_row.get("patch_age_days", 30)),
            internet_facing=bool(risk_row.get("internet_facing", False)),
            control_effectiveness=float(
                risk_row.get("control_effectiveness_pct", 50.0)
            ) / 100.0,
            cve_id=risk_row.get("cve_id"),
            # Full NVD/EPSS enrichment — now wired from risks.py
            epss_score=float(risk_row["epss_score"])
                       if risk_row.get("epss_score") is not None else 0.0,
            epss_percentile=float(risk_row["epss_percentile"])
                            if risk_row.get("epss_percentile") is not None else 0.0,
            days_since_published=int(risk_row["days_since_published"])
                                  if risk_row.get("days_since_published") is not None else 30,
            exploitability_score=float(risk_row.get("exploitability_score") or 0.0),
            impact_score=float(risk_row.get("impact_score") or 0.0),
            attack_vector=encode(risk_row.get("attack_vector"), av_map),
            attack_complexity=encode(risk_row.get("attack_complexity"), ac_map),
            privileges_required=encode(risk_row.get("privileges_required"), pr_map),
            user_interaction=encode(risk_row.get("user_interaction"), ui_map),
            scope=encode(risk_row.get("scope"), sc_map),
            flag_rce=int(risk_row.get("flag_rce") or 0),
            flag_sqli=int(risk_row.get("flag_sqli") or 0),
            flag_xss=int(risk_row.get("flag_xss") or 0),
            flag_buffer_overflow=int(risk_row.get("flag_buffer_overflow") or 0),
            flag_priv_escalation=int(risk_row.get("flag_priv_escalation") or 0),
            flag_dos=int(risk_row.get("flag_dos") or 0),
            flag_dir_traversal=int(risk_row.get("flag_dir_traversal") or 0),
            use_calibrated=True,
            explain=bool(risk_row.get("explain", False)),
        )
    except (TypeError, ValueError, KeyError) as e:
        # Do not manufacture a probability for malformed input. Callers must
        # either reject the record or invoke an explicitly named fallback.
        return {"probability": None, "model": "invalid_input", "error": str(e)}


def get_model_info() -> dict:
    """Return model metadata — used by /api/health and /api/assistant."""
    _load_models()
    if _config:
        checksums_path = MODEL_DIR / "artifact_checksums.json"
        artifact_integrity = {"verified": False, "files": {}}
        if checksums_path.exists():
            checksums = json.loads(checksums_path.read_text(encoding="utf-8"))
            file_results = {}
            for relative_path, expected in checksums.get("files", {}).items():
                artifact_path = MODEL_DIR / relative_path
                actual = hashlib.sha256(artifact_path.read_bytes()).hexdigest() if artifact_path.exists() else None
                file_results[relative_path] = {
                    "expected_sha256": expected,
                    "actual_sha256": actual,
                    "matches": actual == expected,
                }
            artifact_integrity = {
                "verified": bool(file_results) and all(row["matches"] for row in file_results.values()),
                "files": file_results,
            }
        return {
            "model_version":    _config.get("model_version"),
            "trained_on":       _config.get("trained_on"),
            "pr_auc":           _config.get("metrics", {}).get(
                                 "stratified_random_split", {}).get("pr_auc"),
            "recall_at_k":      _config.get("recall_at_k"),
            "probability_bands":_config.get("probability_bands", _DEFAULT_BANDS),
            "features":         _feature_list,
            "india_signal":     "CERT-In advisory flag (is_cert_in)",
            "calibrated":       _calib_model is not None,
            "calibration_runtime": (
                "portable five-fold sigmoid ensemble"
                if isinstance(_calib_model, PortableCalibratedModel)
                else "legacy pickle" if _calib_model is not None else None
            ),
            "known_limitations":_config.get("known_limitations", []),
            "artifact_integrity": artifact_integrity,
            "reported_metrics_status": "metadata_only; holdout rows are not shipped, so metrics cannot be independently reproduced from this repository",
        }
    return {"model_version": "rule_based_v1", "trained_on": None}
