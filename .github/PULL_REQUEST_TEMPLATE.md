## What does this PR do?
<!-- Describe what you built or fixed -->

## CRISPR Pull Request

### Member & Track
- [ ] 🔴 Member 1 — Ingestion  (`feat/ingestion-*` → `develop`)
- [ ] 🟠 Member 2 — Correlation (`feat/correlation-*` → `develop`)
- [ ] 🟡 Member 3 — Risk Engine (`feat/risk-engine-*` → `develop`)
- [ ] 🟢 Member 4 — AI/ML       (`feat/ai-*` → `develop`)
- [ ] 🔵 Member 5 — Optimizer   (`feat/optimizer-*` → `develop`)
- [ ] 🟣 Member 6 — Frontend    (`feat/frontend-*` → `develop`)

---

### What this PR does
<!-- One sentence: what problem does this solve or what feature does it add? -->


### Files changed
<!-- List the files you touched — helps reviewers know your scope -->
- `backend/...`

### Folders I did NOT touch
<!-- Confirm you stayed in your assigned folder -->
- [ ] I did not modify any other member's folder
- [ ] I did not modify `backend/app/main.py` (shared — only Jash edits this)
- [ ] I did not modify `backend/app/models/shared.py` (shared — only Jash edits this)
- [ ] I did not modify `backend/constants.py` (shared)

---

### Type of change
- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code cleanup, no behavior change
- [ ] `test` — tests only
- [ ] `docs` — documentation only
- [ ] `chore` — config, deps, scaffolding

### Commit format used
<!-- Confirm your commits follow the convention -->
- [ ] All commits are prefixed with my track scope (e.g. `feat(ingestion): ...`)

---

### Demo impact
- [ ] Changes EAL calculation — tested against expected demo values
- [ ] Adds/changes an API endpoint — tested with curl or browser
- [ ] Changes frontend — tested in browser at `localhost:3000`
- [ ] No demo impact — internal/structural change

### Self-review checklist
- [ ] Code runs locally without errors
- [ ] `backend/app/api/<my_module>.py` router is registered (or no change needed)
- [ ] No hardcoded credentials or API keys
- [ ] No `.env` file committed

---

### How to test this PR

1. Pull this branch
2. Run `pip install -r requirements.txt --prefer-binary`
3. Run `python -m uvicorn backend.app.main:app --reload --port 8000`
4. Hit `http://localhost:8000/api/<your-endpoint>`
5. Expected response: ...

---
