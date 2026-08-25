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
      "name": "Implement MFA for privileged accounts",
      "description": "Raise MFA coverage to 100% across all assets",
      "cost_inr": 1500000,
      "cost_lakh": 15.0,
      "reduction_inr": 4860000,
      "reduction_lakh": 48.6,
      "rosi_pct": 224,
      "params": { "implement_mfa": true }
    },
    {
      "id": "patch_now",
      "name": "Emergency patch deployment",
      "description": "Immediately patch critical CVEs (raise patch compliance)",
      "cost_inr": 800000,
      "cost_lakh": 8.0,
      "reduction_inr": 3100000,
      "reduction_lakh": 31.0,
      "rosi_pct": 288,
      "params": { "implement_patching": true }
    },
    {
      "id": "segment",
      "name": "Network micro-segmentation",
      "description": "Segment payment environment from rest of network",
      "cost_inr": 3000000,
      "cost_lakh": 30.0,
      "reduction_inr": 3870000,
      "reduction_lakh": 38.7,
      "rosi_pct": 29,
      "params": { "implement_segmentation": true }
    },
    {
      "id": "delay_30",
      "name": "Delay patching by 30 days",
      "description": "What happens if we wait 30 days before patching",
      "cost_inr": 0,
      "cost_lakh": 0,
      "reduction_inr": -2100000,
      "reduction_lakh": -21.0,
      "rosi_pct": null,
      "params": { "patch_delay": 30 }
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
| `edr_expand` | bool | `false` | Full EDR coverage |
| `patch_delay` | int | `0` | Days to delay patching. **Bounded 0–365** — values outside this range return `422` |
| `mfa_coverage` | float | — | Override MFA coverage directly, **bounded 0.0–1.0** |

**Example:**
```bash
curl "http://localhost:8000/api/scenarios?implement_mfa=true"
curl "http://localhost:8000/api/scenarios?implement_mfa=true&implement_patching=true"
curl "http://localhost:8000/api/scenarios?patch_delay=30"
```

Invalid input example:
```bash
curl "http://localhost:8000/api/scenarios?patch_delay=999999"
# → 422 {"detail":[{"type":"less_than_equal","loc":["query","patch_delay"],"msg":"Input should be less than or equal to 365", ...}]}
```

**Response:**
```json
{
  "before_total_eal_inr": 77153736,
  "before_total_eal_lakh": 771.54,
  "after_total_eal_inr": 72293736,
  "after_total_eal_lakh": 722.94,
  "reduction_inr": 4860000,
  "reduction_lakh": 48.6,
  "reduction_pct": 6.3,
  "overrides_applied": { "mfa_coverage": 1.0 },
  "total_eal_inr": 72293736,
  "total_eal_lakh": 722.94,
  "per_asset": [
    {
      "asset_id": "A001",
      "asset_name": "Payment Gateway",
      "before_eal_inr": 24941800,
      "before_eal_lakh": 249.42,
      "after_eal_inr": 23370688,
      "after_eal_lakh": 233.71,
      "reduction_inr": 1571112,
      "reduction_lakh": 15.71,
      "reduction_pct": 6.3,
      "control_change": { "mfa_coverage": 1.0 },
      "before_likelihood": 0.689,
      "after_likelihood": 0.682,
      "control_effectiveness_before": 80.6,
      "control_effectiveness_after": 85.6
    }
  ]
}
```

**Key demo numbers (calibrated, verified against live server):**

| Scenario | `reduction_lakh` |
|---|---|
| MFA | `48.6` |
| Patch now | `31.0` |
| Segmentation | `38.7` |
| Delay 30 days | `-21.0` (risk increases) |

---

### `GET /api/scenarios/{preset_id}`

Run a preset scenario by ID.

**Path:** `mfa` | `patch_now` | `segment` | `delay_30`

**Example:**
```bash
curl "http://localhost:8000/api/scenarios/mfa"
```

**Response:** `{"scenario": {...preset object...}, ...full simulate_enterprise() output}`.
Invalid ID returns `{"error": "Unknown scenario '<id>'", "available": ["mfa", "patch_now", "segment", "delay_30"]}`.

---

### `GET /api/scenarios/compare`

Side-by-side comparison of two preset scenarios — for the Scenarios page's before/after UI.

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `scenario_a` | string | yes | Preset id: `mfa`, `patch_now`, `segment`, or `delay_30` |
| `scenario_b` | string | yes | Same options |

**Note:** this route is registered above `/{preset_id}` in the router — required so FastAPI doesn't mistake `compare` for a preset id.

**Example:**
```bash
curl "http://localhost:8000/api/scenarios/compare?scenario_a=mfa&scenario_b=patch_now"
```

**Response:**
```json
{
  "scenario_a": {
    "id": "mfa",
    "name": "Implement MFA for privileged accounts",
    "reduction_lakh": 48.6,
    "...": "full simulate_enterprise() output for scenario A"
  },
  "scenario_b": {
    "id": "patch_now",
    "name": "Emergency patch deployment",
    "reduction_lakh": 31.0,
    "...": "full simulate_enterprise() output for scenario B"
  },
  "reduction_delta_lakh": 17.6
}
```

Invalid `scenario_a`/`scenario_b` returns `{"error": "Unknown scenario id(s). Available: [...]"}`. Missing either param returns `422`.

---

## Module 2 — Budget Optimizer

### `POST /api/optimize`

Given a budget in ₹, returns the optimal set of security controls to implement.  
Uses PuLP integer programming (CBC solver). Falls back to greedy if the solver doesn't reach an optimal status or PuLP is unavailable.

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
  "budget_inr": 10000000.0,
  "spent_inr": 9700000,
  "remaining_inr": 300000.0,
  "selected_controls": [
    {
      "id": "mfa",
      "name": "MFA for all privileged accounts",
      "cost_inr": 1500000,
      "risk_reduction_inr": 4860000,
      "complexity": "Low",
      "time_weeks": 2
    }
  ],
  "total_reduction_inr": 17530000,
  "total_reduction_lakh": 175.3,
  "risk_reduced_inr": 17530000,
  "total_risk_reduction_pct": 100.0,
  "rosi": 0.81,
  "solver": "pulp"
}
```

**`solver` field values:** `"pulp"` (exact, via PuLP/CBC) or `"greedy"` (fallback if PuLP unavailable or non-optimal).

> **Fixed bug:** earlier builds always returned `"greedy"` regardless of whether PuLP was installed, due to a `NameError` (referencing the `LpProblem` object before creating it) being silently swallowed by a bare `except`. This is now fixed — `solver: "pulp"` is confirmed working against the live server.

---

### `GET /api/optimize`

Same as POST but via query param — useful for frontend sliders.

**Query Parameters:**

| Parameter | Type | Default |
|---|---|---|
| `budget` | float | `10000000` (must be > 0) |

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
    { "id": "mfa", "name": "MFA for all privileged accounts", "cost_inr": 1500000, "risk_reduction_inr": 4860000, "complexity": "Low", "time_weeks": 2 },
    { "id": "patching", "name": "Emergency patch deployment", "cost_inr": 800000, "risk_reduction_inr": 3100000, "complexity": "Medium", "time_weeks": 1 },
    { "id": "segmentation", "name": "Network micro-segmentation", "cost_inr": 3000000, "risk_reduction_inr": 3870000, "complexity": "High", "time_weeks": 6 },
    { "id": "edr_expand", "name": "EDR rollout to all endpoints", "cost_inr": 2000000, "risk_reduction_inr": 2500000, "complexity": "Medium", "time_weeks": 3 },
    { "id": "cloud_hard", "name": "Cloud configuration hardening", "cost_inr": 1500000, "risk_reduction_inr": 1800000, "complexity": "Medium", "time_weeks": 2 },
    { "id": "backup", "name": "Immutable backup implementation", "cost_inr": 600000, "risk_reduction_inr": 900000, "complexity": "Low", "time_weeks": 1 },
    { "id": "training", "name": "Security awareness training", "cost_inr": 300000, "risk_reduction_inr": 500000, "complexity": "Low", "time_weeks": 2 }
  ],
  "total_catalogue_cost_inr": 9700000,
  "total_catalogue_reduction_inr": 17530000
}
```

---

### `GET /api/optimize/recommend`

Top 3 controls by ROI (risk_reduction ÷ cost) that individually fit under a given budget cap. Unlike `/api/optimize`, this doesn't try to fill a whole budget — it's for a "quick wins" dashboard widget where the user hasn't committed to a total spend yet.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `max_budget_inr` | int | `5000000` | Max individual control cost to consider (must be > 0) |

**Example:**
```bash
curl "http://localhost:8000/api/optimize/recommend"
curl "http://localhost:8000/api/optimize/recommend?max_budget_inr=3000000"
```

**Response:**
```json
{
  "max_budget_inr": 5000000,
  "max_budget_lakh": 50.0,
  "recommendations": [
    {
      "id": "patching",
      "name": "Emergency patch deployment",
      "cost_inr": 800000,
      "risk_reduction_inr": 3100000,
      "complexity": "Medium",
      "time_weeks": 1,
      "cost_lakh": 8.0,
      "risk_reduction_lakh": 31.0,
      "roi": 3.88
    },
    {
      "id": "mfa",
      "name": "MFA for all privileged accounts",
      "cost_inr": 1500000,
      "risk_reduction_inr": 4860000,
      "complexity": "Low",
      "time_weeks": 2,
      "cost_lakh": 15.0,
      "risk_reduction_lakh": 48.6,
      "roi": 3.24
    },
    {
      "id": "training",
      "name": "Security awareness training",
      "cost_inr": 300000,
      "risk_reduction_inr": 500000,
      "complexity": "Low",
      "time_weeks": 2,
      "cost_lakh": 3.0,
      "risk_reduction_lakh": 5.0,
      "roi": 1.67
    }
  ]
}
```

Sorted by `roi` descending, capped at 3 results.

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
    { "framework": "ISO_27001", "label": "ISO 27001", "score": 76, "status": "needs_improvement", "controls": { "MFA": "A.9.4", "Patching": "A.12.6", "Segmentation": "A.13.1", "EDR": "A.12.2", "Backup": "A.12.3" } },
    { "framework": "NIST_CSF", "label": "NIST CSF", "score": 82, "status": "adequate", "controls": { "MFA": "PR.AC-7", "Patching": "PR.IP-12", "Segmentation": "PR.AC-5", "EDR": "DE.CM-4", "Backup": "PR.IP-4" } },
    { "framework": "CIS_CONTROLS", "label": "CIS Controls", "score": 85, "status": "adequate", "controls": { "MFA": "CIS-6", "Patching": "CIS-7", "Segmentation": "CIS-12", "EDR": "CIS-10", "Backup": "CIS-11" } },
    { "framework": "RBI_CSF", "label": "RBI CSF", "score": 72, "status": "needs_improvement", "controls": { "MFA": "IAM-3", "Patching": "VM-2", "Segmentation": "NS-4", "EDR": "EP-1", "Backup": "BC-2" } },
    { "framework": "SEBI_CSCRF", "label": "SEBI CSCRF", "score": 81, "status": "adequate", "controls": { "MFA": "AC-2", "Patching": "CM-3", "Segmentation": "SC-7", "EDR": "SI-3", "Backup": "CP-9" } }
  ],
  "average_score": 79.2,
  "lowest": { "framework": "RBI_CSF", "label": "RBI CSF", "score": 72, "status": "needs_improvement", "controls": { "...": "..." } },
  "highest": { "framework": "CIS_CONTROLS", "label": "CIS Controls", "score": 85, "status": "adequate", "controls": { "...": "..." } }
}
```

**`status` field values:**
- `"adequate"` → score ≥ 80
- `"needs_improvement"` → score 70–79
- `"critical"` → score < 70

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
    { "framework": "RBI_CSF", "control": "MFA", "control_ref": "IAM-3", "gap": "42% privileged accounts without MFA", "impact_inr": 4860000, "impact_lakh": 48.6, "priority": "HIGH" },
    { "framework": "NIST_CSF", "control": "Patching", "control_ref": "PR.IP-12", "gap": "21-day patch lag on critical CVE", "impact_inr": 3100000, "impact_lakh": 31.0, "priority": "HIGH" },
    { "framework": "ISO_27001", "control": "Segmentation", "control_ref": "A.13.1", "gap": "Payment environment not fully segmented", "impact_inr": 3870000, "impact_lakh": 38.7, "priority": "MEDIUM" },
    { "framework": "RBI_CSF", "control": "EDR", "control_ref": "EP-1", "gap": "EDR coverage incomplete on non-critical endpoints", "impact_inr": 2500000, "impact_lakh": 25.0, "priority": "MEDIUM" },
    { "framework": "SEBI_CSCRF", "control": "Backup", "control_ref": "CP-9", "gap": "Immutable backups not enforced for payment DB", "impact_inr": 900000, "impact_lakh": 9.0, "priority": "LOW" }
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
result.before_total_eal_lakh   // e.g. 771.54
result.after_total_eal_lakh    // e.g. 722.94
result.reduction_lakh          // e.g. 48.6  ← big green number
result.reduction_pct           // e.g. 6.3%
result.per_asset               // array for per-asset breakdown table

// Before/after comparison view — use the new /compare endpoint directly
// instead of two separate calls:
// GET /api/scenarios/compare?scenario_a=mfa&scenario_b=patch_now
// → { scenario_a: {...}, scenario_b: {...}, reduction_delta_lakh }
```

**`/investments` page:**
```typescript
import { optimize } from '../services/api';

// On OPTIMIZE button click with budget slider value
const result = await optimize(budgetInr);  // POST /api/optimize

// Key fields to display:
result.spent_inr               // e.g. 9700000 (divide by 100000 for lakh)
result.remaining_inr           // e.g. 300000
result.total_reduction_lakh    // e.g. 175.3  ← main headline number
result.rosi                    // e.g. 0.81   → display as "81% ROSI"
result.selected_controls       // array of cards to render
result.solver                  // show "Optimized with PuLP" badge when === "pulp"

// Dashboard "Quick Wins" widget — use /recommend instead of manually
// filtering /optimize/controls:
// GET /api/optimize/recommend?max_budget_inr=5000000
// → { recommendations: [ up to 3 controls, sorted by ROI ] }
```

**`/compliance` page:**
```typescript
import { getCompliance } from '../services/api';

const data = await getCompliance();  // GET /api/compliance

// Radar/bar chart data:
data.frameworks.map(f => ({ name: f.label, score: f.score }))
// → [{ name: "ISO 27001", score: 76 }, { name: "RBI CSF", score: 72 }, ...]

// Highlight lowest:
data.lowest  // { framework: "RBI_CSF", score: 72, ... }
```

**Dashboard top actions widget** (Member 6 uses this on the main dashboard):
```typescript
// Option A: fetch presets, take top 3 by reduction_lakh
const { presets } = await getPresets();
const topActions = presets
  .filter(p => p.reduction_lakh > 0)
  .sort((a, b) => b.reduction_lakh - a.reduction_lakh)
  .slice(0, 3);

// Option B (simpler): use /api/optimize/recommend directly — already
// sorted by ROI and capped at 3, no client-side filtering needed.
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

# Quick-wins questions ("what's a cheap fix?")
r = httpx.get(f"{BASE}/api/optimize/recommend?max_budget_inr=5000000").json()
# → r["recommendations"][0]["name"], r["recommendations"][0]["roi"]

# Comparison questions ("MFA vs patching, which is better?")
r = httpx.get(f"{BASE}/api/scenarios/compare?scenario_a=mfa&scenario_b=patch_now").json()
# → r["reduction_delta_lakh"]

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

**Current result: 45/45 passed.**

Test coverage by area:
- `TestScenarioEngine` (8) — simulator core logic, calibrated demo targets
- `TestOptimizer` (8) — knapsack budget logic, catalogue integrity
- `TestCompliance` (7) — framework scores, gaps
- `TestScenarioAPI` (7) — scenarios/presets/{id} endpoints
- `TestOptimizeAPI` (3) — optimize endpoints
- `TestComplianceAPI` (4) — compliance endpoints
- `TestRecommendAPI` (4) — new `/optimize/recommend` endpoint
- `TestCompareAPI` (4) — new `/scenarios/compare` endpoint

---

## Known-fixed issues (changelog)

- **PuLP solver bug:** `optimize_budget()` referenced the `LpProblem` object before creating it, causing a `NameError` silently swallowed by a bare `except` — the optimizer always fell back to greedy regardless of whether PuLP was installed correctly. Fixed; `solver: "pulp"` confirmed working.
- **`patch_delay` unbounded:** `GET /api/scenarios?patch_delay=` had no upper bound. Now bounded `0 ≤ patch_delay ≤ 365`, returns `422` outside that range.
- **`reduction_pct` magic number:** replaced hardcoded `baseline_eal = 25_000_000` in the optimizer with a computed total from the actual `CONTROLS` catalogue.
- **Deprecation cleanup:** switched from deprecated `PULP_CBC_CMD` to `COIN_CMD` per PuLP's own migration guidance.

---

## Live EC2 Endpoints (always-on)

```
GET http://3.12.111.128:8000/api/scenarios/presets
GET http://3.12.111.128:8000/api/scenarios?implement_mfa=true
GET http://3.12.111.128:8000/api/scenarios/mfa
GET http://3.12.111.128:8000/api/scenarios/compare?scenario_a=mfa&scenario_b=patch_now
GET http://3.12.111.128:8000/api/optimize?budget=10000000
POST http://3.12.111.128:8000/api/optimize body: {"budget_inr": 10000000}
GET http://3.12.111.128:8000/api/optimize/controls
GET http://3.12.111.128:8000/api/optimize/recommend?max_budget_inr=5000000
GET http://3.12.111.128:8000/api/compliance
GET http://3.12.111.128:8000/api/compliance/gaps
GET http://3.12.111.128:8000/api/compliance/scores
GET http://3.12.111.128:8000/docs ← Interactive API explorer
```

---

*Last updated: Member 5 — optimizer branch — 45/45 tests passing — added `/optimize/recommend`, `/scenarios/compare`; fixed PuLP solver bug; bounded `patch_delay`*
