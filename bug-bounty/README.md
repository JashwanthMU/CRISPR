# CRISPR Bug Bounty Portal

This React application provides two prototype views:

- **Report a vulnerability** — researchers submit GitHub Advisory-style reports.
- **Security team** — reviewers inspect reports and accept or reject them.

Security-team users can also create internal advisories from penetration tests,
red-team exercises, and security reviews using the same private Markdown
template. The Overview and Policy tabs contain program guidance, scope, safe
harbor, testing rules, and disclosure expectations. Light and dark themes follow
the system initially and persist the user's selection in the browser.

The advisory composer follows a GitHub Security Advisory-style workflow. Its
Write/Preview editor supports GitHub Flavored Markdown, including headings,
tables, task lists, links, block quotes, inline code, and fenced code blocks.
Markdown is rendered consistently in submitted advisories and triage notes.

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

## Live connector ingestion

Assets and findings from Bug Bounty, Vulnerability Scanner, EDR, XDR, SIEM,
IAM, and Threat Intel are upserted into PostgreSQL when the backend starts.
Security users can also trigger an immediate refresh from the application or API:

```text
POST /api/ingestion/refresh
GET  /api/ingestion/status
```

Both endpoints require a security-team bearer token. The application refreshes
its report queue every five seconds, and the **Sync sources** button performs an
immediate connector refresh. All `/api/findings` endpoints query the live
PostgreSQL-backed connectors, with JSON fallback only when the database is down.

Authentication is role-enforced by the backend. Public deployments should use a
strong `AUTH_SECRET`, managed credentials, HTTPS, rate limiting, and an enterprise
identity provider.
