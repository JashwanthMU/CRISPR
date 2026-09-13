# Project Structure

## Applications

```text
CRISPR/
├── backend/          FastAPI application, domain engines and worker
├── frontend/         Main authenticated React dashboard
├── bug-bounty/       Separate reporter and triage web application
├── crispr_products/  Product-tour prototype; not part of Docker Compose
├── ai/               Assistant orchestration and deterministic tools
├── ml/               Governed model runtime, artifacts and training utilities
├── data/             Explicitly labelled demo fixtures and schemas
├── docs/             Architecture, deployment and methodology documentation
├── tools/            Operator and audit utilities
└── infra/            Reserved infrastructure-as-code location
```

`frontend/` is the primary product UI. `bug-bounty/` is deployed as an
independent portal. `crispr_products/` is a presentation prototype and must not
be imported by either production application.

## Backend boundaries

```text
backend/app/api/       HTTP parsing, authentication and response mapping
backend/services/      Use-case orchestration and transaction boundaries
backend/repositories/  PostgreSQL queries and persistence
backend/connectors/    External provider adapters
backend/ingestion/     Canonical asset, finding and evidence ingestion
backend/*_engine/      Deterministic domain calculations
backend/workers/       Asynchronous job execution
backend/database/      Connections and Alembic migrations
backend/tests/         Cross-module and API tests
```

Dependencies should point inward: API routes and workers call services;
services call repositories, connectors and domain engines. Domain engines must
not import FastAPI route modules. API handlers must not be used as internal
service functions.

## File placement rules

- Put Pydantic HTTP contracts under `backend/app/models/` until a dedicated
  `backend/schemas/` package is introduced.
- Put database access only in `backend/repositories/`.
- Put external network calls only in `backend/connectors/`.
- Put maintenance and audit commands under `tools/`, not in the repository root.
- Put tests next to their owning engine or under `backend/tests/` for integration
  behavior. Test modules must use the `test_*.py` naming convention.
- Do not commit caches, build outputs, local environments, reports or secrets.
- Do not add `.gitkeep` to a directory that already contains tracked files.

## Data modes

`CRISPR_DATA_MODE=live` must fail closed when required evidence is unavailable.
Only `CRISPR_DATA_MODE=demo` may read `data/demo/`. Every API result derived from
fixtures must retain its demo provenance.
