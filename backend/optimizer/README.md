# backend/optimizer/

**Owner:** Member 5 — Optimizer Branch  
**Branch:** `optimizer` → `develop` → `main`

---

## What this module does

The Budget Optimizer answers: **"Given ₹X budget, which controls give the maximum cyber risk reduction?"**

It performs budget-constrained control selection. Each control is either selected or not, and the deployed `greedy_dynamic` solver recomputes marginal risk reduction after every selection so overlapping controls cannot claim the same full benefit.

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

## How the deployed solver works

For every affordable candidate, CRISPR simulates the portfolio with that candidate added, measures incremental EAL reduction, and selects the best marginal reduction-per-rupee. It repeats until no beneficial affordable control remains. The response identifies the solver as `greedy_dynamic`; this deterministic heuristic does not claim global optimality.

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
