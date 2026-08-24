# backend/compliance/

**Owner:** Member 5 — Optimizer Branch  
**Branch:** `optimizer` → `develop` → `main`

---

## What this module does

Maps NovaPay's security controls to **5 Indian and international compliance frameworks**, exposes current compliance scores, and identifies gaps with ₹ financial impact.

This is critical for the demo because NovaPay Financial Services is regulated under **RBI CSF** and **SEBI CSCRF** — two India-specific frameworks.

---

## Files

| File | Purpose |
|---|---|
| `__init__.py` | Public exports: `get_compliance_summary`, `get_gaps`, `FRAMEWORK_CONTROLS`, `COMPLIANCE_SCORES` |
| `mapper.py` | Framework mappings, demo scores, gap analysis |

---

## Frameworks covered

| Framework | Full Name | NovaPay Score | Status |
|---|---|---|---|
| `ISO_27001` | ISO/IEC 27001:2022 | 76% | Needs improvement |
| `NIST_CSF` | NIST Cybersecurity Framework | 82% | Adequate |
| `CIS_CONTROLS` | CIS Controls v8 | 85% | Adequate |
| `RBI_CSF` | RBI Cyber Security Framework | 72% | ⚠️ Lowest — regulated |
| `SEBI_CSCRF` | SEBI Cyber Security & Resilience | 81% | Adequate |

> **RBI CSF at 72% is the demo's compliance risk story** — it's the lowest score and NovaPay is directly regulated by RBI.

---

## Control → Framework mapping

Each control maps to a specific clause/control reference:

```
Control      ISO 27001   NIST CSF    CIS Controls  RBI CSF   SEBI CSCRF
MFA          A.9.4       PR.AC-7     CIS-6         IAM-3     AC-2
Patching     A.12.6      PR.IP-12    CIS-7         VM-2      CM-3
Segmentation A.13.1      PR.AC-5     CIS-12        NS-4      SC-7
EDR          A.12.2      DE.CM-4     CIS-10        EP-1      SI-3
Backup       A.12.3      PR.IP-4     CIS-11        BC-2      CP-9
```

---

## Top compliance gaps (with ₹ impact)

| Framework | Control | Gap | Impact |
|---|---|---|---|
| RBI CSF | MFA (IAM-3) | 42% privileged accounts without MFA | ₹48.6L |
| NIST CSF | Patching (PR.IP-12) | 21-day patch lag on critical CVE | ₹31.0L |
| ISO 27001 | Segmentation (A.13.1) | Payment env not fully segmented | ₹38.7L |
| RBI CSF | EDR (EP-1) | Incomplete EDR on non-critical endpoints | ₹25.0L |
| SEBI CSCRF | Backup (CP-9) | No immutable backups for payment DB | ₹9.0L |

---

## Quick test

```bash
PYTHONPATH=. python -c "
from backend.compliance.mapper import get_compliance_summary, get_gaps
scores = get_compliance_summary()
for s in scores:
    print(s['label'], '-', s['score'], '%', '-', s['status'])

print()
gaps = get_gaps()
for g in gaps:
    print(g['framework'], g['control'], '→ ₹', g['impact_lakh'], 'L')
"
```

Expected output:
```
ISO 27001 - 76 % - needs_improvement
NIST CSF - 82 % - adequate
CIS Controls - 85 % - adequate
RBI CSF - 72 % - needs_improvement
SEBI CSCRF - 81 % - adequate

RBI_CSF MFA → ₹ 48.6 L
NIST_CSF Patching → ₹ 31.0 L
ISO_27001 Segmentation → ₹ 38.7 L
RBI_CSF EDR → ₹ 25.0 L
SEBI_CSCRF Backup → ₹ 9.0 L
```

---

## Imports

```python
from backend.compliance.mapper import get_compliance_summary, get_gaps
```

No dependencies on other members' code — self-contained.

---

## Commit format

```
feat(compliance): <what you did>
```

---

## Do NOT touch

- Any file outside `backend/compliance/`, `backend/app/api/compliance.py`
