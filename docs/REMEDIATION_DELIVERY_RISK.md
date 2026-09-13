# Remediation delivery risk

CRISPR models how estimate overruns, operational absence, workload capacity,
capability gaps and backup coverage change a remediation completion forecast and
the expected financial loss accumulated before completion.

The feature intentionally stores operational availability only. Medical diagnoses,
treatment details and documents must remain in the company's approved HR system.

## Calculation

`P(period) = 1 - (1 - P(annual))^(days / 365)`

`expected loss = P(period) × loss magnitude`

Delay-attributable loss is the forecast-period expected loss minus the planned-period
expected loss. Potential risk reduction is not realized until remediation reaches
`VERIFIED`; a blocked or at-risk ticket has zero realized reduction unless independently
verified evidence is added in a future workflow.

## API

- `POST /api/scenarios/delivery-risk` evaluates a workforce-aware what-if scenario.
- `GET /api/remediation/{ticket_id}/issues` lists tenant-scoped delivery issues.
- `POST /api/remediation/{ticket_id}/issues` reports an operational delivery issue.
- `POST /api/remediation/{ticket_id}/delivery-risk` evaluates a specific ticket.

All endpoints require a security user and derive the organization from the access token.
