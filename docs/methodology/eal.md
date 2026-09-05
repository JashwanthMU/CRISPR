# FAIR Expected Annual Loss (EAL) Methodology

This document summarizes the core FAIR implementation used by CRISPR. For a comprehensive mathematical breakdown, refer to the full methodology document.

## Related Documents
- [Detailed Methodology](methodology.md) - Contains exhaustive formulas, regulatory tables, and downtime matrices.

## Core Formula
CRISPR calculates live Expected Annual Loss as:
`EAL = organization-supplied annual incident probability × loss magnitude`.

The XGBoost target is CISA KEV membership, not annual loss-event frequency.
Phase 5 therefore excludes it from EAL and uses it only for prioritization.
Live calculations require a current record in
`incident_frequency_assessments`; see
[Financial Risk Governance](../governance/financial-risk.md).

### 1. Likelihood
Supplied by a time-bounded, organization-approved FAIR, actuarial, insurance,
or incident-history assessment with an auditable evidence reference. The KEV
model score is returned separately for ranking and never multiplied by loss.

### 2. Loss Magnitude
Calculated based on asset criticality, encompassing:
- Primary response costs (IR, legal).
- Productivity loss (downtime).
- Organization-approved expected regulatory exposure. Statutory maximum
  penalties are not automatically treated as expected fines.
- Reputation damage.

In live mode, missing financial inputs cause HTTP 503 rather than hidden default
values. Downtime duration, incident response, recovery, data breach, reputation,
and expected regulatory exposure must all be supplied by the organization.
Formula inputs and sources are returned in `loss_breakdown.calculation`.
