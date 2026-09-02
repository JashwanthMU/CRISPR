# FAIR Expected Annual Loss (EAL) Methodology

This document summarizes the core FAIR implementation used by CRISPR. For a comprehensive mathematical breakdown, refer to the full methodology document.

## Related Documents
- [Detailed Methodology](methodology/methodology.md) - Contains exhaustive formulas, regulatory tables, and downtime matrices.

## Core Formula
CRISPR calculates modeled loss exposure as:
`modeled loss exposure = annualized CRISPR likelihood proxy × loss magnitude`.

The current XGBoost target is CISA KEV membership, not a measured annual loss
event frequency. Therefore this output must not be described as a fully
validated FAIR EAL until an organization-specific frequency calibration is
trained or supplied.

### 1. Likelihood
Determined by:
- The calibrated KEV-membership likelihood from XGBoost.
- A separately disclosed Internet-exposure multiplier.
- A separately disclosed control-effectiveness multiplier.
- For delay scenarios, a disclosed constant-hazard compounding formula.

### 2. Loss Magnitude
Calculated based on asset criticality, encompassing:
- Primary response costs (IR, legal).
- Productivity loss (downtime).
- Organization-approved expected regulatory exposure. Statutory maximum
  penalties are not automatically treated as expected fines.
- Reputation damage.

In live mode, missing financial inputs cause HTTP 503 rather than hidden default
values. Formula inputs and assumptions are returned in `loss_breakdown.calculation`.
