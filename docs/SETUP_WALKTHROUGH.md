# CRISPR Complete Installation Walkthrough

This guide installs CRISPR with PostgreSQL, the FastAPI backend, the background worker, the main frontend, and the bug-bounty frontend. The interactive installer supports both first-time installation and safe reconfiguration.

## 1. What the installer configures

The installer asks for:

- PostgreSQL database name, username, and password.
- JWT signing secret and integration-credential encryption key.
- Security administrator email and password.
- Live or demo data mode and demo-seeding behavior.
- Browser CORS origins and optional API documentation.
- Optional NVD/NIST API key, identifying user agent, and request interval.
- Optional OpenAI-compatible LLM endpoint and API key.
- Optional GitHub token and organization, followed by real credential verification.

Every optional prompt accepts `skip`. For an existing non-empty value, pressing Enter preserves it. Secret values are not printed while they are entered.

The installer does not request credentials for Tenable, Splunk, CrowdStrike, Okta, Wiz, MISP, ServiceNow, or HackerOne because those production adapters are not implemented yet. Saving those credentials without a working adapter would create a false impression that the platform is connected.

## 2. Prerequisites

Recommended server:

- Ubuntu 22.04 or 24.04.
- At least 4 CPU cores, 8 GB RAM, and 20 GB free disk space.
- Docker Engine and Docker Compose v2.
- `curl`, `python3`, and optionally `jq` for GitHub configuration.
- Outbound HTTPS access to NVD, FIRST EPSS, GitHub, and the optional LLM endpoint.
- Inbound TCP 5173 for the main application and TCP 3000 for bug bounty, restricted by the server firewall as appropriate.

Verify prerequisites:

```bash
docker --version
docker compose version
curl --version
python3 --version
```

If Docker requires elevated access, the installer automatically uses `sudo docker compose`.

## 3. Obtain the project

```bash
git clone https://github.com/JashwanthMU/CRISPR.git
cd CRISPR
git switch feat/platform-connections
```

For an existing checkout:

```bash
cd ~/CRISPR
git pull --ff-only origin feat/platform-connections
```

## 4. Run the interactive installer

```bash
chmod +x install.sh
./install.sh
```

For required secrets with no existing value, the installer will keep asking until a value is supplied. Press Enter at the JWT and integration-encryption prompts to generate cryptographically random values.

Important behavior:

- Existing `.env` values are preserved when Enter is pressed.
- Duplicate keys are consolidated when a value is updated.
- `.env` is set to mode `0600`.
- The script validates `docker compose config` before deployment.
- If PostgreSQL is already running, the script offers a custom-format backup before rebuilding.
- A failed or empty backup stops deployment instead of silently continuing.
- Alembic migrations run automatically when the backend starts.
- The script waits up to 120 seconds for readiness and prints backend/worker logs on failure.

If PostgreSQL already contains data, pressing Enter at the database-name, username, and password prompts is strongly recommended. Changing `POSTGRES_PASSWORD` in `.env` does not change the password stored inside an existing PostgreSQL volume.

## 5. Choosing live or demo mode

Use `live` when presenting or operating with real organizational data:

```text
CRISPR_DATA_MODE=live
DEMO_AUTO_SEED=false
```

Live mode refuses missing assets, findings, model fields, financial inputs, and control postures. It never silently substitutes bundled fixtures.

Use `demo` only for isolated demonstrations and automated tests:

```text
CRISPR_DATA_MODE=demo
DEMO_AUTO_SEED=true
```

Never enable automatic demo seeding on a production database.

## 6. NVD/NIST configuration

An NVD key is optional but recommended for production rate limits. The user agent should include a real operational contact:

```text
NVD_API_KEY=<key issued by NIST>
NVD_USER_AGENT=CRISPR-risk-platform/1.0 security-team@example.com
NVD_REQUEST_INTERVAL_SECONDS=
```

Leaving the interval blank selects the connector's safe automatic interval: approximately 0.7 seconds with a key and 6 seconds without one.

The global NVD feed is world-wide vulnerability intelligence. It does not automatically mean that every CVE affects the organization. Organizational findings require a scanner/SBOM-proven asset-to-CVE mapping.

## 7. GitHub configuration

GitHub is the currently supported credential-managed platform connector. The token must be able to read the selected repositories and, if required, Dependabot alerts. The installer verifies the token against GitHub before storing it encrypted in PostgreSQL.

Skipping GitHub does not affect NVD ingestion or the risk engine. GitHub can be configured later through `POST /api/integrations`.

The integration encryption key must remain stable. Replacing it makes previously stored connector credentials unreadable. Back up this key securely outside the repository.

## 8. Verify the deployment

```bash
sudo docker compose ps
curl -fsS http://localhost:5173/api/health/ready | python3 -m json.tool
sudo docker compose exec backend alembic current
sudo docker compose logs --tail=100 backend worker
```

Expected services:

- `db`: healthy
- `backend`: healthy
- `worker`: running
- `frontend`: running on port 5173
- `bug-bounty`: running on port 3000

The readiness response must report `database: connected`, the current schema revision, the selected data mode, and whether fixture fallback is enabled.

## 9. Authenticate

```bash
TOKEN=$(curl -fsS -X POST http://localhost:5173/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}' |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
```

Do not paste production passwords into shared terminal history. For production operations, construct the request from protected environment variables or a secret manager.

## 10. Required live-data order

The canonical calculation pipeline is:

```text
verified asset inventory
→ verified scanner/SBOM asset-to-CVE mapping
→ NVD and FIRST EPSS enrichment
→ measured control posture
→ approved annual incident-frequency evidence
→ ML prioritization and FAIR loss calculation
→ immutable risk snapshot
```

Live analysis requires all four organizational inputs:

1. Asset inventory through `POST /api/ingestion/assets`.
2. CVE mappings through `POST /api/ingestion/nvd/sync`.
3. Control posture through `POST /api/ingestion/control-postures`.
4. Annual frequency evidence through `POST /api/ingestion/incident-frequencies`.

The asset record must contain verified asset value, hourly downtime cost,
expected downtime hours, incident-response cost, recovery cost, data-breach
exposure, reputation exposure, and expected regulatory exposure. A statutory
maximum must not be entered as an expected fine. The frequency assessment must
come from an approved FAIR exercise, incident-history calibration, actuarial
source, or insurer model; NVD CVSS and KEV membership are not annual frequency.
See `docs/PHASE5_FINANCIAL_GOVERNANCE.md` for the request format.

After inputs are available:

```bash
JOB_ID=$(curl -fsS -X POST http://localhost:5173/api/analysis/run \
  -H "Authorization: Bearer $TOKEN" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')

curl -fsS "http://localhost:5173/api/analysis/jobs/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

curl -fsS http://localhost:5173/api/analysis/snapshots/latest \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Each successful snapshot records the model version, canonical input hash, asset and finding counts, data origin, source lineage, calculation assumptions, per-finding risk, and enterprise aggregation.

## 11. Backup and restore

The installer uses PostgreSQL custom-format backups. Manual backup:

```bash
sudo docker compose exec -T db sh -lc \
  'exec pg_dump --no-password --format=custom -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > crispr-backup.dump
test -s crispr-backup.dump
```

Never trust a zero-byte backup. Test restores on a separate database before relying on them for disaster recovery.

Example restore into an already-created empty database:

```bash
sudo docker compose exec -T db sh -lc \
  'exec pg_restore --no-password --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < crispr-backup.dump
```

The restore command replaces database objects and must only be used during a planned recovery window.

## 12. Updating CRISPR

```bash
git pull --ff-only origin feat/platform-connections
./install.sh
```

Press Enter to preserve existing configuration. Accept the backup, then choose build and start. Never generate a new integration-encryption key during a normal upgrade.

## 13. Troubleshooting

Backend fails readiness:

```bash
sudo docker compose logs --no-color --tail=200 backend
sudo docker compose exec backend alembic current
```

Worker job fails:

```bash
sudo docker compose logs --no-color --tail=200 worker
```

Inspect an analysis job through `/api/analysis/jobs/{job_id}`. Missing live evidence is a data prerequisite failure, not a reason to introduce defaults.

NVD feed fails:

```bash
sudo docker compose exec backend env | grep -E '^NVD_(USER_AGENT|REQUEST_INTERVAL_SECONDS)='
```

Do not print `NVD_API_KEY`, `LLM_API_KEY`, database passwords, JWT secrets, integration-encryption keys, or GitHub tokens into logs or support messages.

## 14. Uninstalling

Stop containers without deleting PostgreSQL data:

```bash
sudo docker compose stop
```

Removing Docker volumes permanently deletes the database and is intentionally not automated by `install.sh`.
