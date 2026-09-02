# ML and financial validation status

This document separates checks reproduced from the repository from claims that
still require source data.

## Reproduced

- SHA-256 verification for the raw model, legacy calibrated pickle, portable
  calibration manifest, and five portable fold boosters.
- Portable five-fold calibrated inference loads successfully.
- Calibrated tier boundaries: `<0.05 LOW`, `0.05–<0.20 MEDIUM`,
  `0.20–<0.40 HIGH`, and `>=0.40 CRITICAL`.
- Invalid probabilities and invalid model inputs are rejected instead of being
  converted into a fabricated 10% fallback.
- Missing EPSS remains missing/zero; `exploit_in_wild` no longer invents EPSS.
- Patch-delay scenarios compound exposure with
  `1 - (1 - p) ** (1 + delay_days / 365)` and disclose that formula.
- Optimizer benefits are recomputed after each selected control, and controls
  below the configured marginal ROSI hurdle are not recommended.
- Monte Carlo ordering and seeded reproducibility invariants.

## Not independently reproducible yet

- ROC-AUC, PR-AUC, calibration error, confusion matrix, and temporal-validation
  values in `model_config.json`. The exact holdout dataset is not committed.
- Whether configured asset values, control costs, downtime rates, and control
  posture match a real organization. These values must come from approved CMDB,
  IAM/EDR/scanner integrations or documented finance/vendor estimates.

Consequently, no audit should report “79/79” merely because metadata fields or
files exist. Model-quality metrics become verified only after running evaluation
against a hash-identified holdout dataset.

## Data-mode guarantee

`CRISPR_DATA_MODE=live` is the default. Live mode reads only database rows marked
`data_origin=LIVE`, refuses missing asset/finding/control data with HTTP 503, and
does not seed JSON fixtures. `CRISPR_DATA_MODE=demo` is an explicit opt-in used
for tests and presentations; calculation responses disclose that mode.
