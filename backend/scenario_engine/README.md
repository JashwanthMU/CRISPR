# backend/scenario_engine/

**Owner:** Member 5 — Optimizer Branch  
**Branch:** `optimizer` → `develop` → `main`

---

## What this module does

The Scenario Engine answers the question: **"What happens to our financial cyber risk if we change a control?"**

It recalculates Expected Annual Loss (EAL) for all 6 NovaPay assets after applying a control override — such as enabling MFA, patching immediately, adding network segmentation, or simulating a 30-day patch delay.

---

## Files

| File | Purpose |
|---|---|
| `__init__.py` | Public exports: `simulate_scenario`, `simulate_enterprise`, `PRESET_SCENARIOS` |
| `simulator.py` | Core simulation engine — all logic lives here |

---

## How it works

```
Control Override (e.g. mfa_coverage=1.0)
        ↓
simulate_enterprise(assets, overrides)
        ↓
  For each asset:
    → calculate_control_effectiveness() [Member 2]
    → calculate_likelihood()            [Member 3]
    → calculate_loss_magnitude()        [Member 3]
    → calculate_eal()                   [Member 3]
        ↓
  Before EAL vs After EAL → reduction_inr
        ↓
Enterprise total reduction
```

No scenario target is hard-coded. Reductions are recomputed from the selected
data mode's findings, assets, loss inputs, and control posture. Assets without a
finding are excluded and reported in `calculation_scope`.

---

## Invariants

- Effective controls must not increase modeled exposure.
- A positive patch delay must increase or maintain exposure.
- `reduction_inr = before_eal_inr - after_eal_inr` for every asset.
- Returned likelihood details identify the model component and every explicit
  environmental/delay multiplier.

---

## Imports

```python
from backend.scenario_engine.simulator import simulate_enterprise, PRESET_SCENARIOS
```

**Depends on (do not modify these — owned by other members):**
- `backend.controls.effectiveness` → `calculate_control_effectiveness`, `DEMO_CONTROLS` *(Member 2)*
- `backend.risk_engine.likelihood` → `calculate_likelihood` *(Member 3)*
- `backend.financial_engine.loss_calculator` → `calculate_loss_magnitude`, `calculate_eal` *(Member 3)*
- `data/demo/assets.json` *(Member 1)*

---

## Quick test

```bash
cd ~/CRISPR
source .venv/bin/activate

PYTHONPATH=. python -c "
import json
from backend.scenario_engine.simulator import simulate_enterprise
assets = json.load(open('data/demo/assets.json'))

# Test MFA scenario — expect ~48.6L
r = simulate_enterprise(assets, {'implement_mfa': True})
print('MFA reduction:', r['reduction_lakh'], 'L')  # expect 48.6

# Test patch delay — expect negative (risk increases)
r2 = simulate_enterprise(assets, {'patch_delay': 30})
print('Delay reduction:', r2['reduction_lakh'], 'L')  # expect -21.0
"
```

---

## Commit format

```
feat(scenarios): <what you did>
```

---

## Do NOT touch

- Any file outside `backend/scenario_engine/`, `backend/app/api/scenarios.py`
- `backend/controls/`, `backend/risk_engine/`, `backend/financial_engine/` — owned by Members 2 & 3
