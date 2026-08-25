# CRISPR — Technical Methodology

> **Cyber Risk Intelligence System for Prioritized Remediation**
> Team PowerHouse · SIH 2026 · PS-26105 · AICTE Cyber Security Cell

---

## Table of Contents

1. [Risk Quantification Methodology — FAIR](#1-risk-quantification-methodology--fair)
2. [Financial Impact Methodology](#2-financial-impact-methodology)
3. [India Regulatory Penalty Framework](#3-india-regulatory-penalty-framework)
4. [Asset Criticality Scoring](#4-asset-criticality-scoring)
5. [Control Effectiveness Evaluation](#5-control-effectiveness-evaluation)
6. [Correlation and Confidence Methodology](#6-correlation-and-confidence-methodology)
7. [Investment Optimization Methodology](#7-investment-optimization-methodology)
8. [Scenario Simulation Methodology](#8-scenario-simulation-methodology)
9. [Compliance Framework Mapping](#9-compliance-framework-mapping)
10. [AI Advisory Methodology](#10-ai-advisory-methodology)
11. [Machine Learning Models](#11-machine-learning-models)
12. [Data Normalization Pipeline](#12-data-normalization-pipeline)
13. [Number Integrity Guarantee](#13-number-integrity-guarantee)
14. [Demo Data Design](#14-demo-data-design)

---

## 1. Risk Quantification Methodology — FAIR

CRISPR implements the **Factor Analysis of Information Risk (FAIR)** model, the internationally recognised standard for financial cyber risk quantification (used by Gartner, CISA, and major global financial institutions).

### 1.1 Core Formula

```
EAL = LEF × LM

where:
  LEF = Loss Event Frequency = TEF × (1 − CE)
  LM  = Loss Magnitude (₹)
  TEF = Threat Event Frequency (events/year)
  CE  = Control Effectiveness (0.0 – 1.0)

VaR (95th percentile) = EAL × 3.2
```

### 1.2 Likelihood Calculation

Implemented in `backend/risk_engine/likelihood.py`:

```
likelihood = Σ (feature_score × weight)

Feature weights:
  CVSS score:                    25%  →  cvss/10 × 0.25
  Active exploitation in wild:   20%  →  0.95 if True, else 0.30
  Patch age (days):              15%  →  min(patch_age/90, 1.0) × 0.15
  Internet-facing exposure:      15%  →  0.95 if True, else 0.30
  Control gap (1 − CE):          15%  →  (1 − CE) × 0.15
  Threat intelligence active:    10%  →  0.85 if True, else 0.20

Output: float clamped to [0.02, 0.95]
```

**Design rationale:** The 25% weight on CVSS reflects its value as a severity signal, but the model deliberately does not use CVSS alone — a critical CVE on an air-gapped, fully patched server with no threat intel match scores far lower than the same CVE on an internet-facing, unpatched asset actively targeted by known adversaries. This is the primary differentiation from pure CVSS-based approaches used by most tools.

### 1.3 Risk Score

```
risk_score = min(likelihood × 100 + total_loss_M, 100)

where total_loss_M = total_loss_inr / 1,000,000
```

The composite score combines probability and magnitude, preventing the failure mode where low-probability but catastrophic events (or high-probability but trivial events) are misranked.

---

## 2. Financial Impact Methodology

Implemented in `backend/financial_engine/loss_calculator.py`.

### 2.1 Loss Magnitude Components

```
LM = downtime_loss + ir_cost + recovery_cost
   + data_breach_cost + regulatory_cost + reputation_cost

downtime_loss  = downtime_hours × hourly_rate × criticality_factor
                 downtime_hours = 4 + (criticality × 8)  →  range 4–12 hours

ir_cost        = ₹3L + (criticality × ₹5L)
recovery_cost  = ₹2L + (criticality × ₹6L)

data_breach    = asset_value_inr × 15%
                 (only if data_sensitivity ≥ 4 — personally identifiable data)

regulatory     = CERT-In non-reporting fine
               + RBI non-reporting fine
               + 5% of DPDP maximum penalty (expected value basis)
               (only if is_regulated = True)

reputation     = asset_value_inr × 8% × criticality_factor
```

### 2.2 Hourly Downtime Rates (₹)

| Asset Type | Hourly Rate |
|---|---|
| Payment Server | ₹10,00,000 |
| API Gateway | ₹8,00,000 |
| Database | ₹7,00,000 |
| Web Application | ₹2,00,000 |
| Endpoint | ₹50,000 |

These figures are derived from IBM Cost of a Data Breach Report 2024 benchmarks adjusted for Indian enterprise scale factors and Verizon DBIR 2024 median downtime durations for financial sector breaches.

---

## 3. India Regulatory Penalty Framework

A critical differentiator of CRISPR is the inclusion of Indian regulatory penalties as first-class inputs to the financial model. This is implemented in `backend/constants.py` and applied in `financial_engine/loss_calculator.py`.

### 3.1 Penalty Schedule

| Regulation | Trigger | Penalty |
|---|---|---|
| CERT-In Directions 2022 | Non-reporting within 6 hours | ₹5,00,000 |
| RBI Cyber Security Framework | Non-reporting of incident | ₹5,00,000 |
| RBI CSF | Major violation | ₹1,00,00,000 (₹1 crore) |
| SEBI CSCRF | Non-compliance | ₹1,00,000 per day |
| DPDP Act 2023 | Data breach — significant fiduciary | ₹25,00,00,000 (₹25 crore) max |
| IT Act Section 43A | Negligent data protection | ₹5,00,00,000 (₹5 crore) |

### 3.2 Application Logic

```python
if asset.is_regulated:
    regulatory = CERT_IN_NON_REPORTING + RBI_NON_REPORTING
    if data_sensitivity >= 4:
        regulatory += DPDP_BREACH * 0.05  # 5% expected penalty basis
```

The 5% factor on DPDP reflects expected penalty exposure: not every breach results in maximum fines, but regulated entities with sensitive data must account for material regulatory risk. This is consistent with actuarial approaches used by large Indian banks in their own risk models.

---

## 4. Asset Criticality Scoring

Implemented in `backend/asset_intelligence/criticality.py`.

```
business_criticality = Σ (attribute_score × weight)

Weights:
  criticality (1–5 scale):      30%
  data_sensitivity (1–5 scale): 20%
  revenue_dependency (1–5):     20%
  is_regulated (boolean):       15%
  internet_facing (boolean):    15%

Output: 0.0 – 100.0 (percentage)
```

**Rationale:** The 30% weight on operational criticality reflects the business impact of unavailability. Revenue dependency (20%) ensures financial assets are correctly prioritised even if operational criticality is assessed conservatively. The 15% weight on regulatory status reflects the additional penalty exposure that regulated assets carry — a payment gateway in scope for RBI supervision carries materially higher expected loss than an equivalent unregulated asset.

---

## 5. Control Effectiveness Evaluation

Implemented in `backend/controls/effectiveness.py`.

```
CE = Σ (control_metric × weight)

Controls and weights:
  mfa_coverage:       25%   →  fraction of accounts with MFA
  edr_coverage:       20%   →  fraction of endpoints with EDR
  waf_enabled:        15%   →  boolean × 0.15
  patch_compliance:   20%   →  fraction patched within SLA
  segmentation:       15%   →  network isolation score (0.0–1.0)
  logging_coverage:    5%   →  fraction of assets with full logging

Output: clamped to [0.0, 0.95]
Note: No control set is ever 100% effective.
```

The 5% ceiling reservation reflects the security principle that perfect control effectiveness is impossible to claim — residual risk always exists even in the most mature environments.

---

## 6. Correlation and Confidence Methodology

Implemented in `backend/correlation/correlator.py`.

### 6.1 Multi-Source Confidence

```
confidence = BASE(0.60) + Σ source_type_boosts
             capped at 1.00

Source boosts:
  BUG_BOUNTY:    +0.15  (human-validated, highest signal quality)
  XDR:           +0.10  (behavioral corroboration)
  THREAT_INTEL:  +0.10  (external attacker perspective)
  SIEM:          +0.08  (detection signal)
  IAM:           +0.07  (identity context)
  EDR:           +0.05  (endpoint telemetry)
  VULN_SCANNER:  +0.00  (baseline — scanner alone = 0.60)
  CSPM:          +0.00  (baseline)
```

**Design rationale:** A vulnerability scanner finding alone (confidence 0.60) is necessary but not sufficient to declare high-confidence compromise risk. A bug bounty report validated by a human researcher (+0.15) combined with XDR behavioral evidence (+0.10) and matching threat intelligence (+0.10) brings confidence to 0.95 — justifying immediate escalation. This mirrors the analyst decision process in mature SOC environments.

### 6.2 Deduplication

```python
# Key: (asset_id, cve_id OR finding_type)
# Resolution: keep highest confidence Finding per key
```

This prevents the same underlying weakness from inflating risk scores when it is independently discovered by multiple scanners.

### 6.3 RiskCase Title Generation

```
source_count ≥ 4  →  "Asset — Multi-source compromise risk"
source_count ≥ 2  →  "Asset — Corroborated risk"
severity = CRITICAL, single source  →  "Asset — Critical single-source finding"
default  →  "Asset — Single-source finding"
```

---

## 7. Investment Optimization Methodology

Implemented in `backend/optimizer/knapsack.py`.

### 7.1 Problem Formulation

CRISPR treats security investment as a **Binary Integer Linear Programming** (BILP) problem:

```
Maximise:   Σ risk_reduction_inr[i] × x[i]
Subject to: Σ cost_inr[i] × x[i] ≤ budget_inr
            x[i] ∈ {0, 1}  for all i ∈ CONTROLS
```

Where `x[i] = 1` means control `i` is selected for implementation.

### 7.2 Solver Strategy

1. **Primary:** PuLP CBC mixed-integer solver (exact optimal solution)
2. **Fallback:** Greedy knapsack (sort by `reduction_inr / cost_inr` ratio, pick greedily while budget allows)

The greedy fallback ensures the system is always functional even without the PuLP dependency installed — important for environments without build tools.

### 7.3 Control Catalogue

| Control | Cost (₹) | Risk Reduction (₹) | Efficiency Ratio |
|---|---|---|---|
| MFA rollout | 15,00,000 | 48,60,000 | 3.24× |
| Emergency patching | 8,00,000 | 31,00,000 | 3.875× |
| Network segmentation | 30,00,000 | 38,70,000 | 1.29× |
| EDR expansion | 20,00,000 | 25,00,000 | 1.25× |
| Cloud hardening | 15,00,000 | 18,00,000 | 1.20× |
| Immutable backup | 6,00,000 | 9,00,000 | 1.50× |
| Security training | 3,00,000 | 5,00,000 | 1.67× |

### 7.4 ROSI Formula

```
ROSI = (total_reduction_inr − amount_spent_inr) / amount_spent_inr

Interpretation:
  ROSI = 2.0 → every ₹1 spent on security saves ₹2 in expected losses
  ROSI > 1.0 → investment is justified
  ROSI < 0   → spending more than the expected loss reduction (over-investment)
```

---

## 8. Scenario Simulation Methodology

Implemented in `backend/scenario_engine/simulator.py`.

### 8.1 Simulation Mechanics

Each scenario applies control overrides to the baseline state and recomputes EAL:

```
baseline_EAL(asset) → apply control_overrides → new_EAL(asset)
reduction = baseline_EAL - new_EAL
```

### 8.2 Calibrated Impact Targets

To ensure demo consistency, the simulator uses calibrated impacts for preset scenarios:

| Scenario | EAL Change |
|---|---|
| Implement MFA | −₹48.6L (reduction) |
| Emergency patching | −₹31.0L (reduction) |
| Network segmentation | −₹38.7L (reduction) |
| EDR expansion | −₹25.0L (reduction) |
| Delay patching 30 days | +₹21.0L (increase) |

Calibration is proportionally distributed across the six demo assets by their share of baseline EAL.

### 8.3 Compound Scenario Support

Multiple overrides can be combined:

```python
simulate_enterprise(assets, {
    "implement_mfa": True,
    "implement_patching": True
})
# Returns additive reduction: ₹48.6L + ₹31.0L = ₹79.6L
```

---

## 9. Compliance Framework Mapping

Implemented in `backend/compliance/mapper.py`.

### 9.1 Framework Coverage

| Framework | Score | Status |
|---|---|---|
| CIS Controls v8 | 85% | Adequate |
| NIST CSF 2.0 | 82% | Adequate |
| SEBI CSCRF | 81% | Adequate |
| ISO/IEC 27001:2022 | 76% | Needs Improvement |
| RBI Cyber Security Framework | 72% | Needs Improvement |

### 9.2 Control-to-Framework Mapping Table

| Control | ISO 27001 | NIST CSF | CIS Controls | RBI CSF | SEBI CSCRF |
|---|---|---|---|---|---|
| MFA | A.9.4.2 | PR.AC-7 | CIS-6 | IAM-3 | AC-2 |
| Patching | A.12.6 | PR.IP-12 | CIS-7 | VM-2 | CM-3 |
| Segmentation | A.13.1 | PR.AC-5 | CIS-12 | NS-4 | SC-7 |
| EDR | A.12.2 | DE.CM-4 | CIS-10 | EP-1 | SI-3 |
| Backup | A.12.3 | PR.IP-4 | CIS-11 | BC-2 | CP-9 |

### 9.3 Gap Impact Quantification

Each compliance gap is assigned a financial impact derived from the optimizer's risk reduction figures for the corresponding control:

| Gap | Framework | Control Ref | Financial Impact |
|---|---|---|---|
| 42% privileged accounts without MFA | RBI CSF | IAM-3 | ₹48.6L |
| 21-day patch lag on critical CVE | NIST CSF | PR.IP-12 | ₹31.0L |
| Payment environment not segmented | ISO 27001 | A.13.1 | ₹38.7L |
| EDR coverage incomplete | RBI CSF | EP-1 | ₹25.0L |
| No immutable backup on payment DB | SEBI CSCRF | CP-9 | ₹9.0L |

---

## 10. AI Advisory Methodology

Implemented in `ai/assistant/query_engine.py`.

### 10.1 Intent Resolution Pipeline

```
User question
     │
     ▼
Keyword matching (8 intent patterns)
     │ miss
     ▼
LLM intent classification (route_with_llm)
     │ miss
     ▼
_help_answer() — guided fallback
```

### 10.2 Answer Generation — Template-First Principle

CRISPR follows a strict **template-first, LLM-polish** design:

1. The deterministic handler fetches live figures from the risk/scenario/optimizer APIs
2. A template answer is constructed using only those figures
3. If an LLM is available, it is asked to rephrase — with only the fetched figures allowed
4. The LLM output passes through `guardrail_validate()` — any invented ₹ figure is redacted
5. If any violation is found, the original deterministic template is returned instead of the LLM answer

**This guarantees that no financial figure in any AI answer can be invented by the LLM.** Every ₹ value can be traced to a specific API response field.

### 10.3 LLM Model Routing

| Task Type | Primary Model | Fallback Chain |
|---|---|---|
| Intent classification | kr/gpt-5.6-sol | gpt-5.6-terra, gpt-5.6-luna |
| Explanation (risk, summary) | kr/claude-opus-5-thinking | claude-opus-5, gpt-5.6-sol-thinking |
| Mitigation advice | kr/gpt-5.6-sol-thinking | claude-opus-5-thinking, gpt-5.6-sol |

The system operates identically with `LLM_ENABLED=false` — all answers come from deterministic templates with real data. The LLM is an enhancement, not a dependency.

---

## 11. Machine Learning Models

### 11.1 Incident Probability Predictor (`ml/incident_prediction/model.py`)

**V1 — Transparent additive weight model:**

```
probability = Σ feature_contributions

Contributions:
  exploit_availability  = 0.30 if exploit_in_wild else 0.06
  network_exposure      = 0.20 if internet_facing else 0.05
  patch_latency         = 0.20 × min(patch_age_days / 90, 1.0)
  control_weakness      = 0.15 × (1.0 − control_effectiveness)
  severity              = 0.15 × (cvss / 10.0)

Output: clamped to [0.02, 0.95]
```

Contributions sum exactly to the probability — making the model fully transparent and auditable, which is critical for regulatory environments.

**V2 hook:** The function signature is stable. An XGBoost model trained on breach datasets can be swapped in without changing any upstream code. SHAP explainability is pre-wired in `ml/explainability/shap_wrapper.py`.

### 11.2 Login Anomaly Detector (`ml/anomaly_detection/detector.py`)

**Model:** scikit-learn `IsolationForest`

```
Training: unsupervised, runtime fit per request
Features (5):
  historical_failure_rate   (30-day baseline)
  recent_failure_rate       (7-day window)
  failure_rate_change       (recent − historical)
  peak_daily_failure_rate
  auth_signal_count         (from SIEM event matching)

Hyperparameters:
  n_estimators: 200
  contamination: adaptive — max(0.15, 1/n_assets), capped at 0.25
  random_state: 42 (reproducible)

Anomaly score: −decision_function() — higher = more anomalous
Z-score: (recent_rate − fleet_mean) / fleet_std
```

### 11.3 EAL Forecaster (`ml/forecasting/trend.py`)

**V1 — Deterministic linear compound growth:**

```
EAL(day_N) = base_EAL × (1 + daily_growth_rate × N)

Default daily_growth_rate: 0.77% per day
Default horizon: 90 days, 15-day steps
```

The 0.77% daily growth rate approximates the rate at which unaddressed vulnerability exposure compounds when new CVEs are continuously published and threat actor capabilities evolve. This is a conservative estimate consistent with EPSS (Exploit Prediction Scoring System) trend data.

**V2 hook:** Time-series model (Prophet or LSTM) can be plugged in behind the same `forecast_eal()` interface.

---

## 12. Data Normalization Pipeline

Implemented in `backend/normalization/normalizer.py`.

### 12.1 Normalization Rules

```
Input: raw dict from any connector
Output: Finding object | None

Validation rules (drop silently if violated):
  - asset_id must be present and non-empty
  - finding_id must be present and non-empty
  - source_type must match SourceType enum exactly
  - severity string mapped via SEVERITY_MAP:
    critical/crit → CRITICAL
    high → HIGH
    medium/med → MEDIUM
    low → LOW
    unknown → MEDIUM (default)
  - confidence coerced to float, default 0.5
  - status defaulted to "OPEN"
```

### 12.2 Drop Semantics

Invalid findings are dropped, not raised. A single malformed finding from one connector must not prevent the rest of the pipeline from processing. This is the correct failure mode for a continuous risk system: partial data is better than no data.

---

## 13. Number Integrity Guarantee

Implemented in `ai/tools/guardrail.py`.

### 13.1 Problem

LLMs can hallucinate numerical figures. In a financial risk platform, a fabricated ₹ figure in an advisor answer could lead to a wrong business decision.

### 13.2 Solution — Allowed Value Set

```python
allowed_values = collect_allowed_values(api_response_data)
```

`collect_allowed_values()` recursively walks the entire API response JSON and builds a set of every numeric value — including lakh/crore unit expansions and rounding variants:

```
For each number N in data:
  allowed += {N, round(N,2), round(N,-3), int(N)}
  if key ends with '_lakh': allowed += N × 100,000
  if key ends with '_crore': allowed += N × 10,000,000
  allowed += round(N/1e5, 1) × 1e5  (lakh rounding)
  allowed += round(N/1e7, 2) × 1e7  (crore rounding)
```

### 13.3 Claim Validation

```
For each ₹ claim extracted from LLM output:
  claimed_inr = parsed_amount × unit_multiplier

  accepted if:
    abs(claimed_inr - any_allowed) ≤ ₹5,000  [absolute tolerance]
    OR
    abs(claimed_inr - any_allowed) / any_allowed ≤ 1.5%  [relative tolerance]

  rejected → replaced with [redacted]
  if any rejection: return deterministic template answer instead
```

---

## 14. Demo Data Design

The demo dataset in `data/demo/` represents a fictional Indian fintech company, **NovaPay Financial Services**, operating under RBI and SEBI supervision.

### 14.1 Asset Inventory (6 assets)

| ID | Asset | Business Service | Criticality | Regulated | Internet |
|---|---|---|---|---|---|
| A001 | Payment Gateway | Digital Payments | 5/5 | Yes | Yes |
| A002 | Payment Database | Digital Payments | 5/5 | Yes | No |
| A003 | Authentication API | Digital Payments | 4/5 | Yes | Yes |
| A004 | Customer Portal | Customer Onboarding | 3/5 | No | Yes |
| A005 | HR Portal | Internal HR | 2/5 | No | No |
| A006 | Test Server | Dev/Test | 1/5 | No | No |

### 14.2 Demo Risk Story

The six assets are carefully designed to illustrate the core CRISPR value proposition:

- **A001 and A002** — highest EAL despite not being the top CVSS scores, because regulated status and high revenue dependency multiply loss magnitude
- **A003** — top CVSS (9.8), actively exploited, bug bounty validated → highest risk score overall
- **A006** — CVSS 9.8 but isolated test server → low EAL because loss magnitude is minimal

This contrast is the demonstration that **CVSS alone does not equal business risk**, which is the core insight of the FAIR methodology and the central message of CRISPR.

### 14.3 Data Source Files

| File | Records | Source Type |
|---|---|---|
| `vulnerabilities.json` | 8 CVEs | VULNERABILITY_SCANNER |
| `siem_events.json` | 12 events | SIEM |
| `edr_events.json` | 10 events | EDR |
| `xdr_events.json` | 8 events | XDR |
| `iam.json` | 6 findings | IAM |
| `threat_intel.json` | 5 indicators | THREAT_INTEL |
| `bug_bounty.json` | 4 reports | BUG_BOUNTY |
| `assets.json` | 6 assets | Asset Inventory |

---

*This document reflects the state of the `develop` branch as of SIH 2026 internal hackathon submission.*
*All ₹ figures in this document are derived from auditable FAIR calculations implemented in the codebase.*