# Enterprise evidence onboarding

All endpoints require a security-user bearer token. Examples use placeholders;
never commit customer credentials or evidence.

## Generic HTTPS connector

Create `POST /api/integrations` with `provider: generic_http`, vendor base URL,
health/events paths, token, pagination fields and field mappings. The token is
encrypted before storage. Plain HTTP is rejected unless
`ALLOW_INSECURE_CONNECTOR_HTTP=true`, for isolated test networks only.

Each provider event needs a stable external ID and ISO-8601 observation time.
The raw object is retained as provenance. Use normalized ingestion for push
sources or sources requiring custom transforms.

For push delivery, configure `webhook_secret` and POST the same JSON shape to
`/api/webhooks/{integration_id}` with `X-CRISPR-Delivery` and
`X-CRISPR-Signature: sha256=<hex HMAC-SHA256>`. Delivery IDs are deduplicated.

## Canonical APIs

- `POST /api/enterprise-evidence/telemetry`
- `POST /api/enterprise-evidence/relationships`
- `POST /api/enterprise-evidence/compliance/requirements`
- `POST /api/enterprise-evidence/compliance/evidence`
- `POST /api/business-risk/events`

Relationship kinds `INTERNET`, `EXTERNAL`, or `UNTRUSTED` identify entry points.
Target kinds `CROWN_JEWEL` or `CRITICAL_ASSET` identify critical targets. Business
events require annual probability/loss evidence and validity dates. Any claimed
control reduction also requires a control evidence reference.

## Verification

```bash
curl -fsS http://localhost:5173/api/health/ready | jq
sudo docker compose exec backend alembic current
sudo docker compose exec backend pytest backend -q
```

Expected head is `0006_enterprise_evidence`. Live-mode empty inputs return empty
or `NOT_ASSESSABLE` results, never fixtures.
