# SIH Executive and Technical Workspaces

The SIH preview is an isolated frontend build served on port `8716`. It uses the
same authenticated, tenant-scoped backend as the main frontend on port `5173`.

```bash
docker compose build sih-frontend
docker compose up -d sih-frontend
```

Open `http://localhost:8716`. The sidebar workspace selector switches between:

- **Executive** — financial exposure, business assets, risk cases, scenario and
  investment decisions, remediation oversight, compliance, and board reports.
- **Technical** — security evidence, findings, detailed attack paths, detection,
  developer remediation, governance, integrations, API, and settings.

The feature flag `VITE_SIH_WORKSPACE=true` is supplied only to `sih-frontend`, so
the existing port `5173` interface remains unchanged.
