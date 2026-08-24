# backend/app/api/ — Member 5 Routers

**Owner:** Member 5 — Optimizer Branch  
**Branch:** `optimizer` → `develop` → `main`

Member 5 owns 3 of the 7 API routers in this folder.

---

## Files owned by Member 5

| File | Router prefix | Description |
|---|---|---|
| `scenarios.py` | `/api/scenarios` | What-if scenario simulation |
| `optimization.py` | `/api/optimize` | Budget optimizer (PuLP knapsack) |
| `compliance.py` | `/api/compliance` | Framework scores and compliance gaps |

**Do NOT edit** (owned by other members):
- `findings.py` — Member 1
- `assets.py` — Member 2
- `risks.py` — Member 3
- `assistant.py` — Member 4

---

## Endpoint reference

### `/api/scenarios`

```
GET  /api/scenarios                          → Run custom scenario with query params
GET  /api/scenarios/presets                  → All 4 pre-built scenarios with live EAL
GET  /api/scenarios/{id}                     → Single preset (mfa | patch_now | segment | delay_30)
```

**Query parameters for `GET /api/scenarios`:**

| Param | Type | Example | Effect |
|---|---|---|---|
| `implement_mfa` | bool | `true` | Raises MFA coverage to 100% |
| `implement_patching` | bool | `true` | Sets patch compliance to 95% |
| `implement_segmentation` | bool | `true` | Raises segmentation to 95% |
| `edr_expand` | bool | `true` | Raises EDR coverage to 100% |
| `patch_delay` | int | `30` | Increases patch age by N days (risk ↑) |
| `mfa_coverage` | float | `0.8` | Sets MFA coverage to exact value |

**Example responses:**

```bash
# MFA scenario
curl "http://localhost:8000/api/scenarios?implement_mfa=true"
# → {before_total_eal_lakh: X, after_total_eal_lakh: Y, reduction_lakh: 48.6, ...}

# Presets list
curl "http://localhost:8000/api/scenarios/presets"

# Single preset
curl "http://localhost:8000/api/scenarios/mfa"
```

---

### `/api/optimize`

```
POST /api/optimize                           → Optimal control portfolio (JSON body)
GET  /api/optimize?budget=10000000           → Same via query param
GET  /api/optimize/controls                  → Full control catalogue
```

**POST body:**
```json
{ "budget_inr": 10000000 }
```

**Response shape:**
```json
{
  "budget_inr": 10000000,
  "spent_inr": 8200000,
  "remaining_inr": 1800000,
  "selected_controls": [...],
  "total_reduction_inr": 15460000,
  "total_reduction_lakh": 154.6,
  "rosi": 0.88,
  "solver": "pulp"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{"budget_inr": 10000000}'
```

---

### `/api/compliance`

```
GET  /api/compliance                         → All framework scores + average
GET  /api/compliance/gaps                    → Top gaps with ₹ impact
GET  /api/compliance/scores                  → Raw score dict only
```

**Example responses:**
```bash
curl "http://localhost:8000/api/compliance"
# → {frameworks: [...], average_score: 79.2, lowest: {ISO_27001...}, highest: {...}}

curl "http://localhost:8000/api/compliance/gaps"
# → {gaps: [...], total_impact_lakh: 161.6}
```

---

## How routers are registered in `main.py`

```python
# backend/app/main.py (shared — do not edit)
from backend.app.api import scenarios, optimization, compliance

app.include_router(scenarios.router,    prefix="/api/scenarios",  tags=["Scenarios"])
app.include_router(optimization.router, prefix="/api/optimize",   tags=["Optimization"])
app.include_router(compliance.router,   prefix="/api/compliance", tags=["Compliance"])
```

---

## Running the API

```bash
cd ~/CRISPR
source .venv/bin/activate
PYTHONPATH=. uvicorn backend.app.main:app --reload --port 8000
```

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Commit format

```
feat(scenarios): ...
feat(optimizer): ...
feat(compliance): ...
```
