# API Schemas and Endpoints

CRISPR provides a comprehensive RESTful API built on FastAPI. 

## Live Documentation
The complete, interactive OpenAPI schema is available dynamically at:
- `GET /docs` (Swagger UI)
- `GET /redoc` (ReDoc)
- `GET /openapi.json` (Raw JSON schema)

## Core Domains
1. **`/api/risks`**: EAL calculations, enterprise VaR summaries, and telemetry models.
2. **`/api/scenarios`**: Baseline and hypothetical scenario simulations.
3. **`/api/optimize`**: Knapsack-based budget optimization and ROSI calculation.
4. **`/api/remediation`**: Finding queue and assignment status.
5. **`/api/integrations`**: 3rd-party telemetry synchronization.
6. **`/api/attack-paths`**: Graph-based path exposure data.

## Standard Error Response
```json
{
  "detail": "Error description string"
}
```
