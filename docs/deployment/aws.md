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

Set a unique `AUTH_SECRET`, security administrator password, and the LLM
configuration. `LLM_BASE_URL` must be reachable from EC2 and expose an
OpenAI-compatible `/models` and `/chat/completions` API. Never commit `.env`.

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
curl -i http://127.0.0.1:8000/api/health
curl -i http://127.0.0.1:5173/api/health
curl -i http://127.0.0.1:3000/api/health

curl -sS -X POST http://127.0.0.1:5173/api/assistant/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is our highest financial cyber risk?"}'
```

The first three calls must return HTTP 200. The assistant response includes an
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

Port `8000` is optional because both frontends proxy `/api`. Do not expose
PostgreSQL port `5432` publicly. A production deployment should put an HTTPS load
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
