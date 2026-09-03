# CRISPR — Member 5 API Integration Guide

> **Owner:** Kadhiravan E G (KADHIRAVANEG) — Branch: `optimizer`  
> **Base URL (EC2):** `http://3.12.111.128:8000`  
> **Base URL (local):** `http://localhost:8000`  
> **All responses:** `Content-Type: application/json`  
> **Auth:** None (open for prototype)

---

## What Member 5 Owns

| Module | Folder | Purpose |
|---|---|---|
| Scenario Engine | `backend/scenario_engine/` | What-if EAL recalculator |
| Budget Optimizer | `backend/optimizer/` | Knapsack — best controls per ₹ budget |
| Compliance Mapper | `backend/compliance/` | ISO 27001, NIST CSF, CIS, RBI, SEBI |
| API Routers | `backend/app/api/scenarios.py` | `/api/scenarios/*` |
| API Routers | `backend/app/api/optimization.py` | `/api/optimize/*` |
| API Routers | `backend/app/api/compliance.py` | `/api/compliance/*` |

---

## Dependencies on Other Members

Member 5 **imports** from these — do not rename or move them:

| File | Owner | What M5 uses |
|---|---|---|
| `backend/risk_engine/likelihood.py` | Member 3 | `calculate_likelihood()` |
| `backend/financial_engine/loss_calculator.py` | Member 3 | `calculate_loss_magnitude()`, `calculate_eal()` |
| `backend/controls/effectiveness.py` | Member 2 | `calculate_control_effectiveness()`, `DEMO_CONTROLS` |
| `data/demo/assets.json` | Member 1 | All 6 NovaPay assets |

---

## Module 1 — Scenario Engine

### `GET /api/scenarios/presets`

Returns 4 pre-built what-if scenarios with pre-calculated EAL impact.

**No parameters.**

**Response:**
```json
{
  "count": 4,
  "presets": [
    {
      "id": "mfa",
      "name": "Implement MFA",
      "description": "Enable MFA for all privileged accounts",
      "cost_inr": 1500000,
      "cost_lakh": 15.0,
      "reduction_inr": 4860000,
      "reduction_lakh": 48.6,
      "rosi_pct": 224.0,
      "overrides": { "implement_mfa": true }
    },
    {
      "id": "patch_now",
      "name": "Patch Immediately",
      "description": "Deploy all critical patches today",
      "cost_inr": 800000,
      "cost_lakh": 8.0,
      "reduction_inr": 3100000,
      "reduction_lakh": 31.0,
      "rosi_pct": 287.5,
      "overrides": { "implement_patching": true }
    },
    {
      "id": "segment",
      "name": "Network Segmentation",
      "description": "Micro-segment payment environment",
      "cost_inr": 3000000,
      "cost_lakh": 30.0,
      "reduction_inr": 3870000,
      "reduction_lakh": 38.7,
      "rosi_pct": 29.0,
      "overrides": { "implement_segmentation": true }
    },
    {
      "id": "delay_30",
      "name": "Delay Patching 30 Days",
      "description": "What happens if we wait?",
      "cost_inr": 0,
      "cost_lakh": 0,
      "reduction_inr": -2100000,
      "reduction_lakh": -21.0,
      "rosi_pct": null,
      "overrides": { "patch_delay": 30 }
    }
  ]
}
```

---

### `GET /api/scenarios`

Run a custom what-if scenario with query parameters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `implement_mfa` | bool | `false` | Enable full MFA (mfa_coverage → 1.0) |
| `implement_patching` | bool | `false` | Full patch compliance |
| `implement_segmentation` | bool | `false` | Full network segmentation |
| `patch_delay` | int | `0` | Days to delay patching (increases risk) |

**Example:**
```bash
curl "http://localhost:8000/api/scenarios?implement_mfa=true"
curl "http://localhost:8000/api/scenarios?implement_mfa=true&implement_patching=true"
curl "http://localhost:8000/api/scenarios?patch_delay=30"
```

**Response:**
```json
{
  "scenario": {
    "implement_mfa": true,
    "implement_patching": false,
    "implement_segmentation": false,
    "patch_delay": 0
  },
  "before_total_eal_inr": 28400000,
  "before_total_eal_lakh": 284.0,
  "after_total_eal_inr": 23540000,
  "after_total_eal_lakh": 235.4,
  "reduction_inr": 4860000,
  "reduction_lakh": 48.6,
  "reduction_pct": 17.1,
  "per_asset": [
    {
      "asset_id": "A001",
      "asset_name": "Payment Gateway",
      "before_eal_inr": 7200000,
      "before_eal_lakh": 72.0,
      "after_eal_inr": 5940000,
      "after_eal_lakh": 59.4,
      "reduction_inr": 1260000,
      "reduction_lakh": 12.6,
      "reduction_pct": 17.5,
      "control_change": { "mfa_coverage": 1.0 }
    }
  ]
}
```

Scenario numbers are dynamic. Do not copy a fixed rupee reduction into a jury
report: record the API response together with its data mode, calculation scope,
model version, and input snapshot.

---

### `GET /api/scenarios/{preset_id}`

Run a preset scenario by ID.

**Path:** `mfa` | `patch_now` | `segment` | `delay_30`

**Example:**
```bash
curl "http://localhost:8000/api/scenarios/mfa"
```

**Response:** Same shape as `GET /api/scenarios` above, plus `"scenario_id"` field.  
Invalid ID returns `{"error": "Preset not found", "valid_ids": ["mfa", "patch_now", "segment", "delay_30"]}`.

---

## Module 2 — Budget Optimizer

### `POST /api/optimize`

Given a budget in ₹, returns the optimal set of security controls to implement.  
Uses PuLP integer programming (CBC solver). Falls back to greedy if solver unavailable.

**Request body:**
```json
{
  "budget_inr": 10000000
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{"budget_inr": 10000000}'
```

**Response:**
```json
{
  "budget_inr": 10000000,
  "budget_lakh": 100.0,
  "spent_inr": 9700000,
  "spent_lakh": 97.0,
  "remaining_inr": 300000,
  "remaining_lakh": 3.0,
  "solver": "pulp_cbc",
  "selected_controls": [
    {
      "id": "mfa",
      "name": "MFA for all privileged accounts",
      "cost_inr": 1500000,
      "cost_lakh": 15.0,
      "risk_reduction_inr": 4860000,
      "risk_reduction_lakh": 48.6,
      "complexity": "Low",
      "time_weeks": 2
    }
  ],
  "total_reduction_inr": 17530000,
  "total_reduction_lakh": 175.3,
  "rosi": 8.06,
  "rosi_pct": 706.0
}
```

**`solver` field values:** `"pulp_cbc"` (exact) or `"greedy"` (fallback).

---

### `GET /api/optimize`

Same as POST but via query param — useful for frontend sliders.

**Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `budget` | float | `10000000` |

**Example:**
```bash
curl "http://localhost:8000/api/optimize?budget=5000000"
```

Response shape identical to POST.

---

### `GET /api/optimize/controls`

Returns the full control catalogue (all 7 options regardless of budget).

**No parameters.**

**Example:**
```bash
curl "http://localhost:8000/api/optimize/controls"
```

**Response:**
```json
{
  "count": 7,
  "controls": [
    {
      "id": "mfa",
      "name": "MFA for all privileged accounts",
      "cost_inr": 1500000,
      "cost_lakh": 15.0,
      "risk_reduction_inr": 4860000,
      "risk_reduction_lakh": 48.6,
      "complexity": "Low",
      "time_weeks": 2
    },
    {
      "id": "patching",
      "name": "Emergency patch deployment",
      "cost_inr": 800000,
      "cost_lakh": 8.0,
      "risk_reduction_inr": 3100000,
      "risk_reduction_lakh": 31.0,
      "complexity": "Medium",
      "time_weeks": 1
    },
    {
      "id": "segmentation",
      "name": "Network micro-segmentation",
      "cost_inr": 3000000,
      "cost_lakh": 30.0,
      "risk_reduction_inr": 3870000,
      "risk_reduction_lakh": 38.7,
      "complexity": "High",
      "time_weeks": 6
    },
    {
      "id": "edr_expand",
      "name": "EDR rollout to all endpoints",
      "cost_inr": 2000000,
      "cost_lakh": 20.0,
      "risk_reduction_inr": 2500000,
      "risk_reduction_lakh": 25.0,
      "complexity": "Medium",
      "time_weeks": 3
    },
    {
      "id": "cloud_hard",
      "name": "Cloud configuration hardening",
      "cost_inr": 1500000,
      "cost_lakh": 15.0,
      "risk_reduction_inr": 1800000,
      "risk_reduction_lakh": 18.0,
      "complexity": "Medium",
      "time_weeks": 2
    },
    {
      "id": "backup",
      "name": "Immutable backup implementation",
      "cost_inr": 600000,
      "cost_lakh": 6.0,
      "risk_reduction_inr": 900000,
      "risk_reduction_lakh": 9.0,
      "complexity": "Low",
      "time_weeks": 1
    },
    {
      "id": "training",
      "name": "Security awareness training",
      "cost_inr": 300000,
      "cost_lakh": 3.0,
      "risk_reduction_inr": 500000,
      "risk_reduction_lakh": 5.0,
      "complexity": "Low",
      "time_weeks": 2
    }
  ]
}
```

---

## Module 3 — Compliance Mapper

### `GET /api/compliance`

Returns compliance scores and summary for all 5 frameworks.

**No parameters.**

**Example:**
```bash
curl "http://localhost:8000/api/compliance"
```

**Response:**
```json
{
  "frameworks": [
    {
      "framework": "ISO_27001",
      "label": "ISO 27001",
      "score": 76,
      "status": "needs_improvement",
      "controls": {
        "MFA": "A.9.4",
        "Patching": "A.12.6",
        "Segmentation": "A.13.1",
        "EDR": "A.12.2",
        "Backup": "A.12.3"
      }
    },
    {
      "framework": "NIST_CSF",
      "label": "NIST CSF",
      "score": 82,
      "status": "adequate",
      "controls": {
        "MFA": "PR.AC-7",
        "Patching": "PR.IP-12",
        "Segmentation": "PR.AC-5",
        "EDR": "DE.CM-4",
        "Backup": "PR.IP-4"
      }
    },
    {
      "framework": "CIS_CONTROLS",
      "label": "CIS Controls",
      "score": 85,
      "status": "adequate",
      "controls": {
        "MFA": "CIS-6",
        "Patching": "CIS-7",
        "Segmentation": "CIS-12",
        "EDR": "CIS-10",
        "Backup": "CIS-11"
      }
    },
    {
      "framework": "RBI_CSF",
      "label": "RBI CSF",
      "score": 72,
      "status": "needs_improvement",
      "controls": {
        "MFA": "IAM-3",
        "Patching": "VM-2",
        "Segmentation": "NS-4",
        "EDR": "EP-1",
        "Backup": "BC-2"
      }
    },
    {
      "framework": "SEBI_CSCRF",
      "label": "SEBI CSCRF",
      "score": 81,
      "status": "adequate",
      "controls": {
        "MFA": "AC-2",
        "Patching": "CM-3",
        "Segmentation": "SC-7",
        "EDR": "SI-3",
        "Backup": "CP-9"
      }
    }
  ],
  "average_score": 79.2,
  "lowest": { "framework": "RBI_CSF", "score": 72 },
  "highest": { "framework": "CIS_CONTROLS", "score": 85 }
}
```

**`status` field values:**
- `"adequate"` → score ≥ 80
- `"needs_improvement"` → score 60–79
- `"critical"` → score < 60

---

### `GET /api/compliance/gaps`

Returns top compliance gaps with ₹ financial impact.

**No parameters.**

**Example:**
```bash
curl "http://localhost:8000/api/compliance/gaps"
```

**Response:**
```json
{
  "count": 5,
  "total_impact_inr": 15230000,
  "total_impact_lakh": 152.3,
  "gaps": [
    {
      "framework": "RBI_CSF",
      "control": "MFA",
      "clause": "IAM-3",
      "gap": "42% privileged accounts without MFA on Payment API",
      "impact_inr": 4860000,
      "impact_lakh": 48.6,
      "priority": "CRITICAL"
    },
    {
      "framework": "NIST_CSF",
      "control": "Patching",
      "clause": "PR.IP-12",
      "gap": "21-day patch lag on critical CVE-2024-21887",
      "impact_inr": 3100000,
      "impact_lakh": 31.0,
      "priority": "HIGH"
    },
    {
      "framework": "ISO_27001",
      "control": "Segmentation",
      "clause": "A.13.1",
      "gap": "Payment environment not fully micro-segmented",
      "impact_inr": 3870000,
      "impact_lakh": 38.7,
      "priority": "HIGH"
    },
    {
      "framework": "CIS_CONTROLS",
      "control": "EDR",
      "clause": "CIS-10",
      "gap": "EDR agent not deployed on 4 legacy endpoints",
      "impact_inr": 2500000,
      "impact_lakh": 25.0,
      "priority": "MEDIUM"
    },
    {
      "framework": "SEBI_CSCRF",
      "control": "Backup",
      "clause": "CP-9",
      "gap": "Backup immutability not enforced on Payment DB",
      "impact_inr": 900000,
      "impact_lakh": 9.0,
      "priority": "MEDIUM"
    }
  ]
}
```

---

### `GET /api/compliance/scores`

Returns raw scores as a flat dict — useful for chart rendering.

**Example:**
```bash
curl "http://localhost:8000/api/compliance/scores"
```

**Response:**
```json
{
  "ISO_27001": 76,
  "NIST_CSF": 82,
  "CIS_CONTROLS": 85,
  "RBI_CSF": 72,
  "SEBI_CSCRF": 81
}
```

---

## For Member 6 (Frontend)

Set your API base URL:
```bash
# .env in frontend/
VITE_API_URL=http://3.12.111.128:8000
```

### Pages that consume Member 5 APIs

**`/scenarios` page:**
```typescript
import { getPresets, getScenarios } from '../services/api';

// Load preset cards on mount
const presets = await getPresets();                          // GET /api/scenarios/presets

// On SIMULATE button click
const result = await getScenarios({ implement_mfa: true }); // GET /api/scenarios?implement_mfa=true

// Key fields to display:
result.before_total_eal_lakh   // e.g. 284.0
result.after_total_eal_lakh    // e.g. 235.4
result.reduction_lakh          // e.g. 48.6  ← big green number
result.reduction_pct           // e.g. 17.1%
result.per_asset               // array for per-asset breakdown table
```

**`/investments` page:**
```typescript
import { optimize } from '../services/api';

// On OPTIMIZE button click with budget slider value
const result = await optimize(budgetInr);  // POST /api/optimize

// Key fields to display:
result.spent_lakh              // e.g. 97.0
result.remaining_lakh          // e.g. 3.0
result.total_reduction_lakh    // e.g. 175.3  ← main headline number
result.rosi                    // e.g. 8.06   → display as "706% ROSI"
result.selected_controls       // array of cards to render
result.solver                  // show "Optimized with PuLP CBC" badge
```

**`/compliance` page:**
```typescript
import { getCompliance } from '../services/api';

const data = await getCompliance();  // GET /api/compliance

// Radar/bar chart data:
data.frameworks.map(f => ({ name: f.label, score: f.score }))
// → [{ name: "ISO 27001", score: 76 }, { name: "RBI CSF", score: 72 }, ...]

// Highlight lowest:
data.lowest  // { framework: "RBI_CSF", score: 72 }
```

**Dashboard top actions widget** (Member 6 uses this on the main dashboard):
```typescript
// Fetch presets, take top 3 by reduction_lakh
const { presets } = await getPresets();
const topActions = presets
  .filter(p => p.reduction_lakh > 0)
  .sort((a, b) => b.reduction_lakh - a.reduction_lakh)
  .slice(0, 3);

// Display as:
// ✓ MFA            ₹48.6L reduction   Cost: ₹15L
// ✓ Segmentation   ₹38.7L reduction   Cost: ₹30L
// ✓ Patch Now      ₹31.0L reduction   Cost: ₹8L
```

---

## For Member 3 (Risk Engine)

Member 5's scenario engine imports your functions directly. These signatures **must not change**:

```python
# backend/risk_engine/likelihood.py
def calculate_likelihood(
    cvss: float,
    exploit_in_wild: bool,
    patch_age_days: int,
    internet_facing: bool,
    control_effectiveness: float,
    threat_intel_active: bool,
) -> float: ...

# backend/financial_engine/loss_calculator.py
def calculate_loss_magnitude(asset: dict) -> dict: ...
def calculate_eal(likelihood: float, loss_magnitude: dict) -> dict: ...
```

If you need to change these signatures, message Kadhiravan first.

---

## For Member 2 (Correlation)

Member 5 imports your control data directly. These **must not change**:

```python
# backend/controls/effectiveness.py

def calculate_control_effectiveness(controls: dict) -> float: ...

DEMO_CONTROLS: dict[str, dict] = {
    "A001": { "mfa_coverage": float, "edr_coverage": float, "waf_enabled": bool,
               "patch_compliance": float, "segmentation": float, "logging_coverage": float },
    # ... A002 through A006
}
```

---

## For Member 4 (AI Advisor)

These endpoints are safe to call from the AI query engine:

```python
# In ai/assistant/query_engine.py — already wired
import httpx

# What-if questions
r = httpx.get(f"{BASE}/api/scenarios?implement_mfa=true").json()
# → r["reduction_lakh"] = 48.6

# Budget questions  
r = httpx.post(f"{BASE}/api/optimize", json={"budget_inr": 10_000_000}).json()
# → r["total_reduction_lakh"], r["rosi"], r["selected_controls"][0]["name"]

# Compliance questions
r = httpx.get(f"{BASE}/api/compliance").json()
# → r["lowest"]["framework"] = "RBI_CSF", r["lowest"]["score"] = 72
```

---

## Running Tests

```bash
cd ~/CRISPR
source .venv/bin/activate
PYTHONPATH=. pytest backend/tests/test_member5.py -v
```

**Current result: 37/37 passed.**

---

## Live EC2 Endpoints (always-on)

```
GET  http://3.12.111.128:8000/api/scenarios/presets
GET  http://3.12.111.128:8000/api/scenarios?implement_mfa=true
GET  http://3.12.111.128:8000/api/scenarios/mfa
GET  http://3.12.111.128:8000/api/optimize?budget=10000000
POST http://3.12.111.128:8000/api/optimize          body: {"budget_inr": 10000000}
GET  http://3.12.111.128:8000/api/optimize/controls
GET  http://3.12.111.128:8000/api/compliance
GET  http://3.12.111.128:8000/api/compliance/gaps
GET  http://3.12.111.128:8000/api/compliance/scores
GET  http://3.12.111.128:8000/docs                  ← Interactive API explorer
```

---

*Last updated: Member 5 — optimizer branch — 37/37 tests passing*
