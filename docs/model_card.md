# CRISPR Model Card

## XGBoost Vulnerability Exploitation Predictor

**Model Name:** `crispr_xgb_calibrated`
**Version:** `xgb_v4_final`
**Type:** XGBoost classifier with sigmoid/Platt calibration

### Overview
This model estimates calibrated CISA KEV-membership likelihood from public
vulnerability attributes. It also exposes the uncalibrated model score for
ranking. It does **not** directly predict an annual incident frequency.

### Intended Use
Use the calibrated output for prioritization. CRISPR may use it as one component
of an explicitly labelled annualized proxy, but the model output must not be
presented by itself as a FAIR annual loss-event frequency.

### Inputs & Features
- **Temporal**: `days_since_published`
- **CVSS v3 Vectors**: `attack_vector`, `attack_complexity`, `privileges_required`, `user_interaction`, `scope`
- **Scores**: `cvss`, `epss_score`, `epss_percentile`, `exploitability_score`, `impact_score`
- **CWE Flags**: `flag_rce`, `flag_sqli`, `flag_xss`, `flag_buffer_overflow`, `flag_priv_escalation`, `flag_dos`, `flag_dir_traversal`

`patch_age_days`, `internet_facing`, `control_effectiveness`, and the caller's
`exploit_in_wild` flag are environmental inputs handled outside XGBoost. They
are not trained model features.

### Performance metrics

The artifact metadata reports random-split ROC-AUC 0.9819 and PR-AUC 0.4788,
plus temporal ROC-AUC 0.9810 and PR-AUC 0.4909. These are **metadata claims,
not independently reproduced checks in this repository**, because the exact
holdout rows are not included. The previous `PR-AUC > 0.75` statement was
incorrect and has been removed.

Runtime tests verify artifact checksums, portable loading, probability bounds,
tier boundaries, malformed-input rejection, SHAP response shape, and scenario
and financial invariants. They do not substitute for holdout evaluation.

### Limitations
- The model is primarily trained on CISA KEV and NVD data, which may not capture bespoke zero-day threats.
- Requires regular retraining (recommended monthly) to maintain temporal accuracy.
- CISA KEV membership is not equivalent to annual enterprise incident frequency.
- The committed training scripts require real NVD, FIRST EPSS, and CISA KEV
  exports and do not generate synthetic fallback rows.
