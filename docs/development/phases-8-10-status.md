# Phases 8–10: enterprise implementation framework

CRISPR is provider-neutral. A deploying company supplies credentials, endpoint
URLs, identifiers, telemetry, relationships, control evidence and financial
assumptions. The platform does not invent missing live inputs.

## Phase 8 — connectors and telemetry

- GitHub and NVD remain first-class adapters.
- `generic_http` connects to an HTTPS JSON API with encrypted credentials,
  configurable field mappings, pagination cursors and scheduled synchronization.
- Canonical telemetry and relationship APIs accept normalized SIEM, EDR/XDR,
  scanner, CMDB, IAM, CSPM and network evidence idempotently.
- Live anomaly screening reports sample count, observation window, method and
  limitations. Insufficient data returns `NOT_ASSESSABLE`.

The durable worker supplies retry/backoff and sync-run history. Non-JSON vendor
protocols implement the existing `Connector` contract without changing domain
calculations or storage.

## Phase 9 — financial risk model v2

- Versioned organization risk events retain frequency/loss evidence and expiry.
- Portfolio simulation runs asynchronously through the existing job worker.
- Output includes analytic EAL, VaR/expected shortfall, Monte Carlo error,
  convergence, sensitivities, formulas and assumptions.
- Shared shock groups model correlated occurrences. CVE classifier output is
  never used as annual incident frequency.

## Phase 10 — live compliance and attack paths

- Requirement inventories and time-bounded evidence drive compliance scores.
- Missing or expired evidence is `UNKNOWN`, never a passing result.
- Attack paths use only current organization relationship edges.
- Reachability is not described as verified exploitability.
- Financial impact remains zero unless the company supplies evidence.

## Deployment order

1. Run `alembic upgrade head` (revision `0008_remediation_delivery_risk`).
2. Configure live mode and secrets with `./install.sh` or `.env`.
3. Add GitHub/`generic_http`, or post normalized canonical evidence.
4. Run calculations and inspect jobs at `/api/analysis/jobs/{job_id}`.

See `docs/deployment/enterprise-evidence.md` for onboarding and verification.
