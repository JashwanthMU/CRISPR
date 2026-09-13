# CRISPR Ingestion Backend

This module loads security-source data into PostgreSQL and serves it through
database-backed connectors. PostgreSQL 15 runs from the root
`docker-compose.yml`; the named volume `crispr_postgres_data` preserves data
between container restarts.

## Database structure

```text
users
  user_id (PK)
      │
      └──< bug_bounty_reports.reporter_user_id (FK)

assets                         findings
  asset_id (PK)                  finding_id (PK)
  payload JSONB                  asset_id (indexed logical reference)
  updated_at                     source_type (indexed)
                                 source_name
                                 payload JSONB
                                 first_seen
                                 ingested_at
```

### `users`

Stores reporter and security-team identities.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | UUID, primary key | Stable user identity |
| `name` | varchar(120) | Display name |
| `email` | varchar(255), unique | Login identifier |
| `password_hash` | text | PBKDF2-SHA256 password hash |
| `role` | varchar(16) | `REPORTER` or `SECURITY` |
| `created_at` | timestamptz | Account creation time |

Passwords are never stored directly.

### `bug_bounty_reports`

Stores researcher submissions and their security-team review lifecycle.
`reporter_user_id` references `users.user_id`.

Important fields include:

- `report_id` (UUID primary key)
- Reporter identity and affected `asset_id`
- Weakness, severity, description, impact, and reproduction steps
- Optional remediation and CVE
- Triage notes and reviewer
- Creation and update timestamps

Status is restricted to `SUBMITTED`, `ACCEPTED`, or `REJECTED`. Accepted reports
are converted to normalized `BUG_BOUNTY` findings when findings are queried.

### `assets`

Stores the current asset inventory. `asset_id` is the primary key, while
`payload` retains the complete asset object as JSONB. `updated_at` records the
most recent upsert. The expanded demo contains 20 assets.

### `findings`

Stores normalized records from Bug Bounty, Vulnerability Scanner, EDR, XDR,
SIEM, IAM, and Threat Intel.

| Column | Type | Purpose |
|---|---|---|
| `finding_id` | varchar(64), primary key | Deduplication and upsert key |
| `source_type` | varchar(40), indexed | Connector category |
| `source_name` | varchar(120) | Product producing the record |
| `asset_id` | varchar(32), indexed | Affected asset |
| `payload` | JSONB | Full normalized and source-specific record |
| `first_seen` | date | Original observation date |
| `ingested_at` | timestamptz | Most recent refresh time |

Relational columns support filtering and correlation. JSONB preserves fields
that vary by source, such as CVSS, patch age, exploit status, MFA coverage, and
privileged-account counts.

## Ingestion lifecycle

```text
data/demo/*.json
       ↓ backend startup or POST /api/ingestion/refresh
upsert assets by asset_id and findings by finding_id
       ↓
PostgreSQL assets + findings
       ↓ database-first connectors
/api/findings, /sources, /correlate, /asset/{asset_id}
```

Refreshes are idempotent: existing IDs are updated and new IDs are inserted.
The backend performs a refresh during startup. Security-team users can request
an immediate refresh from the application with **Sync sources** or through the
API. JSON fallback is available only when `CRISPR_DATA_MODE=demo`; live mode
returns an error rather than substituting fixture records.

## Current demo volume

| Dataset | Records |
|---|---:|
| Assets | 20 |
| Bug Bounty | 11 |
| Vulnerability Scanner | 11 |
| EDR | 10 |
| XDR | 10 |
| SIEM | 10 |
| IAM | 10 |
| Threat Intel | 10 |
| **Total findings** | **72** |

## APIs

```text
GET  /api/findings
GET  /api/findings/sources
GET  /api/findings/correlate
GET  /api/findings/asset/{asset_id}
GET  /api/ingestion/status
POST /api/ingestion/refresh
POST /api/ingestion/assets
POST /api/ingestion/control-postures
POST /api/ingestion/nvd/sync
POST /api/ingestion/nvd/refresh
```

The ingestion status and refresh endpoints require an authenticated
security-team bearer token.

## Live NVD ingestion

NVD describes CVEs globally; it does not prove that a CVE affects a particular
asset. Live ingestion therefore requires an explicit scanner, SBOM, or CMDB
mapping containing `asset_id`, `cve`, `first_seen`, and `patch_age_days`.
CRISPR then retrieves CVSS/CWE/vector fields from NVD CVE API 2.0 and current
EPSS values from FIRST. Records missing inputs required by the deployed model
are reported as failures and are not replaced with guessed values.

Set `CRISPR_DATA_MODE=live`, `NVD_API_KEY`, and a contact-bearing
`NVD_USER_AGENT` in `.env`, restart the backend, authenticate, then load assets
and control postures before calling `/api/ingestion/nvd/sync`. Example mapping:

```json
{
  "mappings": [{
    "asset_id": "payment-api-01",
    "cve": "CVE-2024-3400",
    "first_seen": "2026-09-03",
    "patch_age_days": 2,
    "patch_available": true,
    "mapping_source": "Tenable production scan",
    "confidence": 1.0
  }],
  "include_epss": true
}
```

Successful rows include retrieval timestamps, source URLs, CVSS source/type,
and a `provenance.synthetic_fields: []` declaration. Repeating the same
asset/CVE mapping updates its deterministic finding rather than duplicating it.
After initial ingestion, `/api/ingestion/nvd/refresh` refreshes NVD and EPSS
metadata for all mapped live CVEs. Patch age is intentionally retained from
the scanner record because NVD publication age is not an asset's patch age.

## Running and inspecting PostgreSQL

From the repository root:

```bash
docker compose up --build -d
docker compose exec db psql -U crispr -d crispr
```

Useful SQL:

```sql
\dt
SELECT COUNT(*) FROM assets;
SELECT source_type, COUNT(*)
FROM findings
GROUP BY source_type
ORDER BY source_type;

SELECT finding_id, source_type, asset_id,
       payload->>'severity' AS severity
FROM findings
ORDER BY first_seen DESC;
```

Run the seeder manually from the repository root:

```bash
python backend/ingestion/seed.py
```

The schema is created idempotently by
`backend.database.connection.init_database()`. Data upserts are implemented by
`backend.ingestion.store.refresh_demo_sources()`.
