# CRISPR Incident-Prediction Model Card

## Identity

| Field | Value |
|---|---|
| Model version | `xgb_v4_final` |
| Algorithm | XGBoost binary classifier plus five-fold sigmoid calibration |
| Training date recorded in metadata | 2026-08-28 |
| Target | Membership in the CISA Known Exploited Vulnerabilities catalogue |
| Feature count | 20 |
| Portable runtime | Five XGBoost JSON boosters with explicit sigmoid coefficients |
| Runtime output | Calibrated KEV-membership likelihood plus raw ranking score |

## Intended use

Approved after a passing runtime validation:

- Prioritizing CVEs for analyst review.
- Relative ordering of vulnerability remediation work.
- Supplying one explicitly labelled signal to a wider risk model.

Not approved:

- Treating the model output as a directly observed annual incident probability.
- Autonomous remediation without analyst and asset-context review.
- Claiming performance for an organization or time period that has not been evaluated.
- Claiming the metadata ROC-AUC, PR-AUC, calibration, or temporal scores were independently reproduced from this repository.

The positive label is CISA KEV membership. It is not an annual-frequency target. Directly multiplying this probability by loss magnitude for EAL requires a separately validated transformation or annual-frequency model. Until that work is completed, CRISPR governance reports `direct_eal_probability: NOT_APPROVED`.

## Inputs

The ordered model feature contract is stored in `model_config.json` and checked during every governance validation. The inputs are CVSS/EPSS values, publication age, CVSS categorical encodings and impact/exploitability subscores, CERT-In membership, and vulnerability-description flags.

Environmental fields such as internet exposure, control effectiveness, patch age, and observed exploitation are not learned features in this artifact. If another engine applies them as modifiers, it must disclose the formula separately.

Live risk calculations reject missing required NVD/EPSS/CVSS fields. Missing values must not be replaced with unlabelled synthetic estimates.

## Training-data provenance

The metadata names NVD, FIRST EPSS, CISA KEV, and a curated CERT-In list. The acquisition utility accepts explicit source exports, joins them without synthetic rows, and writes SHA-256 hashes into a dataset manifest.

The exact training and holdout rows used to produce the shipped model are not included. Therefore:

- Shipped performance numbers are historical metadata, not independently reproducible evidence.
- Training-to-live distribution drift cannot be calculated honestly.
- PSI, KS, calibration error, and updated performance must remain `NOT_ASSESSABLE` until a hash-identified reference profile or holdout dataset is supplied.

## Runtime validation

`POST /api/model-governance/validate` queues an auditable validation job that checks:

- SHA-256 integrity of model configuration, feature importance, ranking model, legacy pickle, calibration manifest, and five fold boosters.
- Exact ordered 20-feature contract.
- Complete, non-overlapping probability bands over `[0,1]`.
- Use of the portable five-fold calibrated runtime.
- Deterministic inference on low, medium, and high representative feature vectors.
- Finite probabilities within `[0,1]` and absence of silent rule-based fallback.

Validation evidence is persisted in `model_validation_runs`; it is not calculated only for display.

## Explainability

Per-record SHAP explanations describe the raw XGBoost ranking booster. They do not explain the final five-fold calibrated ensemble probability. The API includes this limitation with every explanation. If SHAP cannot run, the system returns no explanation instead of manufacturing one.

## Drift and data quality

`POST /api/model-governance/drift` queues an assessment over the organization's current vulnerability inputs. It reports row count and missing rates for required live fields.

Distribution drift remains `NOT_ASSESSABLE` until the training reference distribution is supplied. This is intentional: a drift score without the reference population would be false evidence.

## Known limitations

- The positive KEV class is small relative to the negative population.
- Metadata reports materially lower recall at strict decision thresholds.
- EPSS is an influential feature and may encode overlapping public exploitation information.
- Several CVSS categorical inputs were unavailable in the historical source and recorded as unknown.
- CERT-In context is based on a curated list, not a complete real-time Indian exploitation feed.
- Global vulnerability behavior does not establish organization-specific exploit frequency.

## Operational procedure

Authenticate and queue validation:

```bash
VALIDATION_JOB=$(curl -fsS -X POST http://localhost:5173/api/model-governance/validate \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')

sleep 10
curl -fsS http://localhost:5173/api/model-governance/status \
  -H "Authorization: Bearer $TOKEN" | jq
```

Queue live-input quality/drift assessment:

```bash
DRIFT_JOB=$(curl -fsS -X POST http://localhost:5173/api/model-governance/drift \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')

sleep 10
curl -fsS http://localhost:5173/api/model-governance/drift-reports \
  -H "Authorization: Bearer $TOKEN" | jq
```

Validation should run after every model artifact change, dependency upgrade, and production deployment. Drift/data-quality assessment should run after ingestion and on a scheduled basis once a reference profile is available.
