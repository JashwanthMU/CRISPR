# AWS EC2 deployment

The Docker deployment uses same-origin API routing:

```text
Browser → EC2:5173 → frontend Nginx → backend:8000
Browser → EC2:3000 → bug-bounty Nginx → backend:8000
backend → db:5432
backend → configured LLM_BASE_URL
```

`backend` and `db` are Docker service names and are reachable only inside the
Compose network. Browser code must not use `localhost:8000`; both frontend Nginx
containers proxy `/api/` to the backend.

## 1. Check out the correct branch

```bash
git fetch origin
git switch develop
git pull --ff-only origin develop
```

Confirm that `backend/Dockerfile`, `frontend/Dockerfile`, and
`bug-bounty/Dockerfile` exist before building.

## 2. Configure secrets

```bash
cp .env.example .env
openssl rand -hex 32
nano .env
```

Set unique PostgreSQL credentials, `AUTH_SECRET`, security administrator
password, and the LLM configuration. Generate separate random values for the
database password and signing secret; never reuse them. `LLM_BASE_URL` must be
reachable from EC2 and expose an
OpenAI-compatible `/models` and `/chat/completions` API. Never commit `.env`.

The signing secret must be at least 32 characters and the administrator
password must be at least 12 characters. The backend intentionally refuses to
start with weaker credentials. Sign in to the dashboard with
`SECURITY_ADMIN_EMAIL` and `SECURITY_ADMIN_PASSWORD`.

JWT sessions last 12 hours and are kept in browser session storage. Findings,
assets, risks, scenarios, optimization, compliance, AI, and ingestion routes
require a security-team token. Bug-bounty reporters can only access their own
submissions; review actions require the security role.

API documentation is disabled by default. Enable `API_DOCS_ENABLED=true` only
for temporary trusted-network troubleshooting. Set `CORS_ORIGINS` to exact
HTTPS application origins in production; wildcards are not supported by the
deployment template.

### Existing PostgreSQL volume

Changing `POSTGRES_PASSWORD` does not automatically change the password inside
an already-initialized PostgreSQL volume. For an existing deployment, rotate it
interactively (the password will not be placed in shell history), then put the
same new value in `.env`:

```bash
sudo docker compose exec db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\password $POSTGRES_USER"'
```

Do not delete the database volume merely to rotate a password.

## 3. Start and inspect

```bash
sudo docker compose down
sudo docker compose up --build -d
sudo docker compose ps
sudo docker compose logs --tail=150 backend frontend bug-bounty db
```

All four services should be running and `db`/`backend` should be healthy.

## 4. Verify from EC2

```bash
curl -i http://127.0.0.1:5173/api/health
curl -i http://127.0.0.1:3000/api/health

curl -sS -X POST http://127.0.0.1:5173/api/assistant/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is our highest financial cyber risk?"}'
```

The health calls must return HTTP 200. The assistant response includes an
`engine` field; inspect backend logs if it falls back rather than using the LLM.

Check the LLM service directly from EC2 without printing the key:

```bash
set -a
source .env
set +a
curl -i --max-time 30 "$LLM_BASE_URL/models" \
  -H "Authorization: Bearer $LLM_API_KEY"
```

## 5. EC2 security group

For a prototype, allow inbound TCP from your own public IP:

- `22` — SSH
- `5173` — CRISPR dashboard
- `3000` — bug-bounty portal

The backend port `8000` and PostgreSQL port `5432` are intentionally not
published by Compose. Do not expose them publicly. A production deployment
should put an HTTPS load
balancer or Nginx reverse proxy on ports 80/443 and keep all application ports
private.

## Troubleshooting

```bash
sudo docker compose ps
sudo docker compose logs -f backend
sudo docker compose logs -f frontend
sudo docker compose exec backend env | grep -E '^LLM_(ENABLED|BASE_URL)='
sudo docker compose exec backend python -c \
  "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/health').read().decode())"
```

- `localhost:8000` in browser developer tools means an old frontend image. Pull
  the latest code and rebuild with `--no-cache` once.
- HTTP 502 from a frontend means the backend is stopped or unhealthy.
- Template AI responses mean the LLM is disabled, the key is missing, or the LLM
  endpoint is unreachable from EC2.
- A timeout usually means EC2 outbound networking, DNS, the LLM firewall, or the
  upstream model service is blocking the request.
