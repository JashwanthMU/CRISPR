# CRISPR Model Card

## XGBoost Vulnerability Exploitation Predictor

**Model Name:** `crispr_xgb_calibrated`
**Version:** 1.0
**Type:** XGBoost Classifier with Platt Scaling / Isotonic Calibration

### Overview
This model predicts the probability of a vulnerability (CVE) being exploited in the wild within the next 30 days based on EPSS percentiles, CVSS vectors, and temporal factors.

### Intended Use
Used within the CRISPR platform to dynamically adjust vulnerability likelihood for FAIR (Factor Analysis of Information Risk) EAL (Expected Annual Loss) calculations.

### Inputs & Features
- **Temporal**: `patch_age_days`, `days_since_published`
- **CVSS v3 Vectors**: `attack_vector`, `attack_complexity`, `privileges_required`, `user_interaction`, `scope`
- **Scores**: `cvss`, `epss_score`, `epss_percentile`, `exploitability_score`, `impact_score`
- **CWE Flags**: `flag_rce`, `flag_sqli`, `flag_xss`, `flag_buffer_overflow`, `flag_priv_escalation`, `flag_dos`, `flag_dir_traversal`

### Performance Metrics (Validation Set)
- **ROC-AUC**: > 0.85
- **PR-AUC**: > 0.75
- **Brier Score**: < 0.10 (indicating strong calibration)

### Limitations
- The model is primarily trained on CISA KEV and NVD data, which may not capture bespoke zero-day threats.
- Requires regular retraining (recommended monthly) to maintain temporal accuracy.
