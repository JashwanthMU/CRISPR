# CRISPR — JOKER53 Contribution

**Member:** KADHIRAVAN EG  
**Branch:** `optimizer`  
**Responsibility:** Scenario Engine · Budget Optimizer · Compliance Mapping

---

## Branch rules (READ FIRST)

```
main       ← stable / demo-ready  (merge from develop only)
  ↑
develop    ← integration & testing (all members PR here first)
  ↑
optimizer  ← YOUR branch (Member 5 only — never touch other folders)
```

- **Always** `git pull origin develop` before starting a session
- **Never** commit to `main` directly
- **Never** edit files owned by other members (see ownership table below)
- Open PR: `optimizer → develop` when your work is ready
- PR `develop → main` only after all members' branches pass on `develop`

---

## What Member 5 owns

```
backend/
├── scenario_engine/
│   ├── __init__.py
│   └── simulator.py          ← what-if EAL recalculator
├── optimizer/
│   ├── __init__.py
│   └── knapsack.py           ← PuLP budget optimizer
├── compliance/
│   ├── __init__.py
│   └── mapper.py             ← framework scores + gap analysis
└── app/
    └── api/
        ├── scenarios.py      ← GET /api/scenarios, /presets, /{id}
        ├── optimization.py   ← POST/GET /api/optimize
        └── compliance.py     ← GET /api/compliance, /gaps
```

### File ownership across the whole project

| Folder / File | Owner | Branch |
|---|---|---|
| `backend/connectors/`, `backend/ingestion/`, `data/demo/` | Member 1 | `ingestion` |
| `backend/normalization/`, `backend/correlation/`, `backend/controls/`, `backend/asset_intelligence/` | Member 2 | `correlation` |
| `backend/risk_engine/`, `backend/financial_engine/`, `backend/app/api/risks.py` | Member 3 | `risk-engine` |
| `ml/`, `ai/`, `backend/app/api/assistant.py` | Member 4 | `ai` |
| `backend/scenario_engine/`, `backend/optimizer/`, `backend/compliance/`, `backend/app/api/scenarios.py`, `backend/app/api/optimization.py`, `backend/app/api/compliance.py` | **Member 5** | **`optimizer`** |
| `frontend/` | Member 6 | `frontend` |
| `backend/app/main.py`, `backend/app/models/`, `backend/constants.py` | Shared / Lead | `main` |

---

## API endpoints delivered

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/scenarios` | Custom scenario with query overrides |
| GET | `/api/scenarios/presets` | 4 pre-built scenarios with live EAL |
| GET | `/api/scenarios/{id}` | Single preset (`mfa`, `patch_now`, `segment`, `delay_30`) |
| POST | `/api/optimize` | Optimal control portfolio for given ₹ budget |
| GET | `/api/optimize` | Same via query param |
| GET | `/api/optimize/controls` | Full control catalogue |
| GET | `/api/compliance` | Framework scores + average |
| GET | `/api/compliance/gaps` | Gaps with ₹ impact |
| GET | `/api/compliance/scores` | Raw scores dict |

---

## Demo numbers that must always work

| Scenario | Reduction | Cost | ROSI |
|---|---|---|---|
| MFA | ₹48.6L | ₹15L | 224% |
| Patch now | ₹31.0L | ₹8L | 288% |
| Segmentation | ₹38.7L | ₹30L | 29% |
| Delay 30 days | −₹21.0L | ₹0 | — |
| ₹1Cr optimizer | ₹1.5Cr+ reduction | ₹1Cr | ~50% |

| Framework | Score |
|---|---|
| ISO 27001 | 76% |
| NIST CSF | 82% |
| CIS Controls | 85% |
| RBI CSF | 72% |
| SEBI CSCRF | 81% |

---

## Setup & run

```bash
# 1. Clone and switch to your branch
git clone https://github.com/JashwanthMU/CRISPR.git
cd CRISPR
git checkout optimizer

# 2. Create virtualenv
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Verify Member 5 modules (no server needed)
PYTHONPATH=. python scripts/verify_member5.py

# 5. Run tests
PYTHONPATH=. pytest backend/tests/test_member5.py -v

# 6. Start API
PYTHONPATH=. uvicorn backend.app.main:app --reload --port 8000
```

Smoke-test URLs:
- http://localhost:8000/api/health
- http://localhost:8000/api/scenarios/presets
- http://localhost:8000/api/compliance
- `POST http://localhost:8000/api/optimize` with `{"budget_inr": 10000000}`

---

## Committing your work

```bash
git checkout optimizer
git add backend/scenario_engine/ \
        backend/optimizer/ \
        backend/compliance/ \
        backend/app/api/scenarios.py \
        backend/app/api/optimization.py \
        backend/app/api/compliance.py

git commit -m "feat(optimizer): <what you did>"
git push origin optimizer
```

Then open a PR on GitHub: **`optimizer → develop`**

---

## Commit message format

```
feat(scenarios): add presets endpoint with live EAL
feat(optimizer): PuLP knapsack with greedy fallback
feat(compliance): add framework gaps with ₹ impact
fix(optimizer): handle budget less than cheapest control
test(member5): add unit tests for MFA scenario target
```
