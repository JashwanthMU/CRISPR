# Backend Improvement Roadmap

## Completed foundations

1. Persistent platform state, migrations, secure credentials and sync jobs.
2. Canonical risk snapshots with evidence lineage.
3. Guided setup and deployment documentation.
4. ML artifact validation and governance records.
5. Evidence-backed financial-frequency governance.

## Phase 6 — Tenant isolation and merge safety

Use tenant-scoped identifiers and foreign keys, pass organization context
through assistant and threat-intelligence services, and enforce CI on pull
requests targeting `develop`.

## Phase 7 — Typed APIs and truthful live UI

Add response models and a stable error contract, generate frontend types, merge
the duplicate API clients, and prohibit fixture fallback in live mode.

## Phase 8 — Real connector and telemetry platform

Implement incremental vendor synchronization, retries, rate limits, webhooks,
sync observability and real SIEM/EDR time-series ingestion.

## Phase 9 — Financial risk model v2

Model business risk events, organization-evidenced control effects, uncertainty
and correlated losses instead of treating findings as independent events.

## Phase 10 — Live compliance and attack paths

Derive policy evidence, compliance gaps and attack paths from canonical live
assets, identities, findings and control posture.

## Phase 11 — Production security and operations

Add scoped authorization, SSO/MFA, service accounts, worker heartbeats,
structured observability, backup restoration tests and managed secrets.

## Phase 12 — Reproducible ML lifecycle

Version datasets and splits, retain reference distributions, automate drift
assessment and implement controlled retraining and model promotion.

## Phase 13 — Release engineering

Add frontend tests, PostgreSQL integration tests, migration and tenant-isolation
tests, load/security gates, dependency locks and automated release checks.
