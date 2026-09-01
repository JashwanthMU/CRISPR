# FAIR Expected Annual Loss (EAL) Methodology

This document summarizes the core FAIR implementation used by CRISPR. For a comprehensive mathematical breakdown, refer to the full methodology document.

## Related Documents
- [Detailed Methodology](methodology/methodology.md) - Contains exhaustive formulas, regulatory tables, and downtime matrices.

## Core Formula
CRISPR calculates EAL dynamically using the standard FAIR formula:
`EAL = Likelihood (Event Frequency) x Loss Magnitude`

### 1. Likelihood
Determined by:
- The base calibrated probability from the XGBoost model.
- Scaled downward by environmental `control_effectiveness`.
- Adjusted upward based on `threat_intel_active` or Internet exposure.

### 2. Loss Magnitude
Calculated based on asset criticality, encompassing:
- Primary response costs (IR, legal).
- Productivity loss (downtime).
- Regulatory fines (e.g., GDPR, CCPA, HIPAA).
- Reputation damage.
