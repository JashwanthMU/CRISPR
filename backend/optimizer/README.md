# backend/optimizer/

**Owner:** Member 5 — Optimizer Branch  
**Branch:** `optimizer` → `develop` → `main`

---

## What this module does

The Budget Optimizer answers: **"Given ₹X budget, which controls give the maximum cyber risk reduction?"**

It solves a **0-1 knapsack problem** — each control is either fully selected or not. The goal is to maximise total `risk_reduction_inr` without exceeding `budget_inr`.

Primary solver: **PuLP integer programming (CBC)**  
Fallback: **Greedy (bang-per-buck ratio ranking)**

---

## Files

| File | Purpose |
|---|---|
| `__init__.py` | Public exports: `optimize_budget`, `CONTROLS` |
| `knapsack.py` | Solver logic + control catalogue |

---

## Control catalogue (7 controls)

| ID | Name | Cost | Risk Reduction | ROSI |
|---|---|---|---|---|
| `mfa` | MFA for all privileged accounts | ₹15L | ₹48.6L | 3.24x |
| `patching` | Emergency patch deployment | ₹8L | ₹31L | 3.88x |
| `segmentation` | Network micro-segmentation | ₹30L | ₹38.7L | 1.29x |
| `edr_expand` | EDR rollout to all endpoints | ₹20L | ₹25L | 1.25x |
| `cloud_hard` | Cloud configuration hardening | ₹15L | ₹18L | 1.20x |
| `backup` | Immutable backup implementation | ₹6L | ₹9L | 1.50x |
| `training` | Security awareness training | ₹3L | ₹5L | 1.67x |

---

## Demo target (₹1Cr budget)

With ₹1,00,00,000 (₹1 Cr), the optimizer should select:  
**MFA + Patching + EDR + Segmentation + Backup + Training**  
→ Total reduction: **₹1.5Cr+**

```bash
PYTHONPATH=. python -c "
from backend.optimizer.knapsack import optimize_budget
r = optimize_budget(10_000_000)
print('Controls:', [c['id'] for c in r['selected_controls']])
print('Reduction:', r['total_reduction_lakh'], 'L')
print('ROSI:', r['rosi'], 'x')
print('Solver:', r['solver'])
"
```

---

## How PuLP is used

```python
prob = LpProblem("CRISPR_Optimizer", LpMaximize)
x = {c["id"]: LpVariable(c["id"], cat="Binary") for c in CONTROLS}

# Objective: maximise risk reduction
prob += lpSum(x[c["id"]] * c["risk_reduction_inr"] for c in CONTROLS)

# Constraint: stay within budget
prob += lpSum(x[c["id"]] * c["cost_inr"] for c in CONTROLS) <= budget_inr
```

If PuLP is not installed or the solver fails, `_greedy_select()` kicks in automatically — the API still returns a valid result.

---

## Imports

```python
from backend.optimizer.knapsack import optimize_budget, CONTROLS
```

No dependencies on other members' code — this module is self-contained.

---

## Commit format

```
feat(optimizer): <what you did>
```

---

## Do NOT touch

- Any file outside `backend/optimizer/`, `backend/app/api/optimization.py`
