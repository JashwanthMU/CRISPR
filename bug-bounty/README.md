# CRISPR Bug Bounty Portal

This React application provides two prototype views:

- **Report a vulnerability** — researchers submit GitHub Advisory-style reports.
- **Security team** — reviewers inspect reports and accept or reject them.

Accepted reports are converted to normalized `BUG_BOUNTY` findings and appear in
`GET /api/findings`, `/api/findings/correlate`, and the relevant asset endpoint.

## Run the full stack

From the repository root:

```bash
docker compose up --build
```

Open:

- Portal: <http://127.0.0.1:3000>
- FastAPI documentation: <http://127.0.0.1:8000/docs>
- PostgreSQL: `127.0.0.1:5432` (database/user/password: `crispr`)

Local security-team login:

- Email: `security@novapay.com`
- Password: `NovaPay-Security-2026`

Researchers create their own accounts from the registration screen. Override
`AUTH_SECRET`, `SECURITY_ADMIN_EMAIL`, and `SECURITY_ADMIN_PASSWORD` in a root
`.env` file outside local development.

The named Docker volume `crispr_postgres_data` preserves reports between
container restarts.

The container runs `backend.app.ingestion_main`, a standalone entry point that
does not depend on unfinished API routers owned by other project members.

## Run in development

Start PostgreSQL and the backend from the repository root:

```bash
docker compose up db backend
```

Then start Vite:

```bash
cd bug-bounty
npm install
npm run dev
```

Vite runs at <http://127.0.0.1:5173> and talks to the backend at
`http://127.0.0.1:8000` by default. Set `VITE_API_URL` to override it.

## API workflow

1. `POST /api/bug-bounty/reports` submits a report as `SUBMITTED`.
2. `GET /api/bug-bounty/reports?status=SUBMITTED` returns the triage queue.
3. `PATCH /api/bug-bounty/reports/{report_id}/review` accepts or rejects it.
4. Accepted reports automatically appear in `GET /api/findings`.

Authentication is role-enforced by the backend. Public deployments should use a
strong `AUTH_SECRET`, managed credentials, HTTPS, rate limiting, and an enterprise
identity provider.
