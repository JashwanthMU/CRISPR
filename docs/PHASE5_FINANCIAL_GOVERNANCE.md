# Phase 5 — Financial Risk Governance

## Outcome

Live Expected Annual Loss (EAL) no longer treats the ML model's CISA KEV
membership score as an annual incident probability. The ML model ranks CVEs;
an organization-owned, time-bounded frequency assessment supplies the annual
probability used by EAL and Monte Carlo.

## Calculation contract

```text
KEV model output -> prioritization/ranking only
Annual frequency evidence -> annual incident probability
Asset evidence -> loss magnitude in INR
EAL = annual incident probability × loss magnitude
```

Every assessment records the finding, probability, methodology, evidence
reference, source, confidence, observation time, expiry time, creator, and
immutable creation time. The latest unexpired assessment is used. Missing or
expired evidence causes live financial APIs to return an explicit error.

Live assets must also supply `expected_downtime_hours`,
`incident_response_cost_inr`, `recovery_cost_inr`,
`data_breach_exposure_inr`, and `reputation_exposure_inr`, in addition to the
existing asset value, hourly downtime cost, and expected regulatory exposure.
The live engine sums these supplied components; it does not substitute industry
percentages or bundled demo constants.

Scenario calculations start from the evidenced current annual probability and
apply a disclosed relative residual-control formula. Patch delay uses the
disclosed extended-exposure formula. These are scenario assumptions, not ML
features, and are returned in API results and stored with snapshots.

## Ingest frequency evidence

Use an approved FAIR assessment, actuarial analysis, insurer model, or
incident-history calibration. Do not copy the NVD CVSS or KEV probability.

```bash
curl -fsS -X POST http://localhost:5173/api/ingestion/incident-frequencies \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "source_name": "Approved FAIR assessment",
    "assessments": [{
      "finding_id": "NVD-ffb34ca9eb4e8fdd",
      "annual_incident_probability": 0.12,
      "methodology": "FAIR calibrated expert estimate",
      "evidence_reference": "GRC-FAIR-2026-Q3-0042",
      "confidence": 0.80,
      "observed_at": "2026-09-03T00:00:00Z",
      "valid_until": "2026-12-03T00:00:00Z"
    }]
  }' | jq
```

The probability above is illustrative only. Replace every assessment field
with approved organizational evidence before running live financial analysis.
