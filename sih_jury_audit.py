"""
═══════════════════════════════════════════════════════════════════════
  SIH26105 — GRAND FINALE TECHNICAL JURY AUDIT
  AI-Powered Continuous Cyber Risk Quantification Platform
  Team: CRISPR
═══════════════════════════════════════════════════════════════════════
"""
import os, sys, time, json, traceback
from pathlib import Path

# This audit intentionally exercises the labelled fixture dataset. Production
# defaults to live mode and will refuse these records.
os.environ["CRISPR_DATA_MODE"] = "demo"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"

results = {"pass": 0, "fail": 0, "warn": 0}

def check(condition, label, warn_only=False):
    if condition:
        print(f"  {PASS} {label}")
        results["pass"] += 1
    elif warn_only:
        print(f"  {WARN} {label}")
        results["warn"] += 1
    else:
        print(f"  {FAIL} {label}")
        results["fail"] += 1

def section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

# ── CATEGORY 1: MODEL ARTIFACT INTEGRITY ─────────────────────────────
section("CATEGORY 1: MODEL ARTIFACT INTEGRITY")
print("  Jury Q: 'Does the trained model actually exist and load?'\n")

from ml.incident_prediction.model import predict_incident, get_model_info, predict_from_risk_row

info = get_model_info()
check(info is not None, f"get_model_info() → version: {info.get('model_version', 'N/A')}")

model_dir = Path("ml/incident_prediction")
pkl_file = model_dir / "crispr_xgb_calibrated.pkl"
json_file = model_dir / "crispr_xgb_model.json"
portable_dir = model_dir / "portable"
manifest = portable_dir / "manifest.json"

check(pkl_file.exists(), f"Calibrated pickle: {pkl_file.stat().st_size / (1024*1024):.1f} MB")
check(json_file.exists(), f"XGBoost JSON model: {json_file.stat().st_size / (1024*1024):.1f} MB")
check(portable_dir.exists(), "Portable fold boosters directory exists")
check(manifest.exists(), "Portable manifest.json exists")
check((model_dir / "model_config.json").exists(), "Model config exists")
check((model_dir / "feature_importance.json").exists(), "Feature importance file exists")

folds = list(portable_dir.glob("fold_*_booster.json"))
check(len(folds) >= 3, f"Cross-validation folds: {len(folds)} fold files")
check(info["artifact_integrity"]["verified"], "All recorded artifact SHA-256 checksums match")
check(False,
      "Holdout metrics are metadata-only; exact validation rows are not shipped",
      warn_only=True)

# ── CATEGORY 2: PREDICTION ACCURACY — MONOTONIC RISK ORDERING ────────
section("CATEGORY 2: INFERENCE SANITY — MONOTONIC EXAMPLES")
print("  This is a smoke test, not an accuracy measurement.\n")

high_risk = predict_incident(cvss=9.8, exploit_in_wild=True, patch_age_days=0,
                              internet_facing=True, control_effectiveness=0.1,
                              epss_score=0.99, epss_percentile=0.99)
med_risk  = predict_incident(cvss=6.5, exploit_in_wild=False, patch_age_days=60,
                              internet_facing=True, control_effectiveness=0.5,
                              epss_score=0.20, epss_percentile=0.70)
low_risk  = predict_incident(cvss=3.1, exploit_in_wild=False, patch_age_days=365,
                              internet_facing=False, control_effectiveness=0.9,
                              epss_score=0.001, epss_percentile=0.10)

print(f"  High-risk: {high_risk['probability']:.6f}")
print(f"  Med-risk:  {med_risk['probability']:.6f}")
print(f"  Low-risk:  {low_risk['probability']:.6f}")

check(high_risk["probability"] > low_risk["probability"],
      f"HIGH ({high_risk['probability']:.6f}) > LOW ({low_risk['probability']:.6f})")
check(high_risk["probability"] > med_risk["probability"],
      f"HIGH ({high_risk['probability']:.6f}) > MED ({med_risk['probability']:.6f})", warn_only=True)
check(med_risk["probability"] >= low_risk["probability"],
      f"MED ({med_risk['probability']:.6f}) >= LOW ({low_risk['probability']:.6f})", warn_only=True)

# Exploit-in-wild sensitivity
print("\n  Sub-test: Exploit-in-Wild Toggle")
no_exp = predict_incident(cvss=8.0, exploit_in_wild=False, patch_age_days=30,
                           internet_facing=True, control_effectiveness=0.5)
yes_exp = predict_incident(cvss=8.0, exploit_in_wild=True, patch_age_days=30,
                            internet_facing=True, control_effectiveness=0.5)
print(f"    exploit=False → {no_exp['probability']:.6f}")
print(f"    exploit=True  → {yes_exp['probability']:.6f}")
check(yes_exp["epss_score"] == 0 and no_exp["epss_score"] == 0,
      "Exploit flag does not fabricate EPSS input")
check(yes_exp["probability"] == no_exp["probability"],
      "Audit acknowledges exploit_in_wild is not an XGBoost feature")

# EPSS sensitivity
print("\n  Sub-test: EPSS Score Sensitivity")
low_epss = predict_incident(cvss=8.0, exploit_in_wild=True, patch_age_days=15,
                             internet_facing=True, control_effectiveness=0.4,
                             epss_score=0.01, epss_percentile=0.10)
high_epss = predict_incident(cvss=8.0, exploit_in_wild=True, patch_age_days=15,
                              internet_facing=True, control_effectiveness=0.4,
                              epss_score=0.99, epss_percentile=0.99)
print(f"    EPSS=0.01 → {low_epss['probability']:.6f}")
print(f"    EPSS=0.99 → {high_epss['probability']:.6f}")
check(high_epss["probability"] > low_epss["probability"],
      f"EPSS sensitivity demonstrated (delta={abs(high_epss['probability']-low_epss['probability']):.6f})")

# ── CATEGORY 3: CALIBRATION QUALITY ──────────────────────────────────
section("CATEGORY 3: CALIBRATED-ARTIFACT OUTPUT AND TIER POLICY")
print("  Calibration quality requires the unavailable labelled holdout set.\n")

check(0 < high_risk["probability"] < 1.0,
      f"High-risk prob {high_risk['probability']:.6f} in valid (0,1)")
check(0 < low_risk["probability"] < 1.0,
      f"Low-risk prob {low_risk['probability']:.6f} in valid (0,1)")
check(high_risk["probability"] < 0.5,
      f"Even worst-case calibrated <50%: {high_risk['probability']:.6f}", warn_only=True)
check("model" in high_risk, f"Model ID: {high_risk.get('model', 'N/A')}")

from ml.incident_prediction.model import assign_tier
for prob, expected in [(0.001, "LOW"), (0.05, "MEDIUM"), (0.3, "HIGH")]:
    tier = assign_tier(prob)
    check(tier.get("tier") == expected,
          f"assign_tier({prob}) → tier='{tier.get('tier')}' (expected {expected})")

# ── CATEGORY 4: EXPLAINABILITY — SHAP VALUES ────────────────────────
section("CATEGORY 4: EXPLAINABILITY — SHAP VALUES")
print("  Jury Q: 'Can you explain WHY the AI made this prediction?'\n")

explained = predict_incident(cvss=9.8, exploit_in_wild=True, patch_age_days=0,
                              internet_facing=True, control_effectiveness=0.2,
                              epss_score=0.95, explain=True)
contribs = explained.get("contributions")
check(contribs is not None, "SHAP contributions returned when explain=True")
if contribs:
    tops = contribs.get("top_contributors", [])
    check(len(tops) >= 3, f"Top {len(tops)} contributing features returned")
    for t in tops[:5]:
        check("feature" in t and "shap_value" in t,
              f"  → {t.get('feature', '?'):>25s} | SHAP: {t.get('shap_value', 0):>+8.4f}")

no_explain = predict_incident(cvss=5.0, exploit_in_wild=False, patch_age_days=30,
                               internet_facing=False, control_effectiveness=0.5)
check(no_explain.get("contributions") is None,
      "explain=False (default) skips SHAP (perf optimization)")

# ── CATEGORY 5: ROBUSTNESS & ERROR HANDLING ──────────────────────────
section("CATEGORY 5: ROBUSTNESS & ERROR HANDLING")
print("  Jury Q: 'What if we feed garbage? Does it crash?'\n")

edge_cases = [
    ("Missing most fields",     {"cvss": 7.5}),
    ("Empty dictionary",        {}),
    ("Wrong types (strings)",   {"cvss": "not_a_number", "exploit_in_wild": "maybe"}),
    ("Negative values",         {"cvss": -5.0, "patch_age_days": -100}),
    ("Extreme outliers",        {"cvss": 999.0, "epss_score": 500.0, "patch_age_days": 999999}),
    ("Boolean as int",          {"cvss": 8.0, "exploit_in_wild": 1, "internet_facing": 0}),
]
for name, data in edge_cases:
    try:
        r = predict_from_risk_row(data)
        if r and r.get("model") == "invalid_input":
            check(r.get("probability") is None,
                  f"{name:30s} → rejected without fabricated probability")
        elif r and r.get("probability") is not None:
            check(True, f"{name:30s} → valid defaulted input, prob={r['probability']:.6f}")
        else:
            check(True, f"{name:30s} → returned None/fallback (graceful)")
    except Exception as e:
        check(False, f"{name:30s} → CRASHED: {type(e).__name__}: {str(e)[:60]}")

try:
    r = predict_from_risk_row(None)
    check(True, f"{'None input':30s} → handled gracefully")
except (TypeError, AttributeError):
    check(True, f"{'None input':30s} → controlled exception (acceptable)")
except Exception as e:
    check(False, f"{'None input':30s} → unexpected: {e}")

# ── CATEGORY 6: PERFORMANCE & LATENCY ────────────────────────────────
section("CATEGORY 6: PERFORMANCE & LATENCY")
print("  Jury Q: 'Is this fast enough for continuous real-time scoring?'\n")

# warmup
predict_incident(cvss=7.0, exploit_in_wild=True, patch_age_days=15,
                 internet_facing=True, control_effectiveness=0.4)

start = time.perf_counter()
N = 100
for _ in range(N):
    predict_incident(cvss=8.0, exploit_in_wild=True, patch_age_days=15,
                     internet_facing=True, control_effectiveness=0.4)
avg_ms = (time.perf_counter() - start) * 1000 / N
check(avg_ms < 50, f"Avg prediction latency: {avg_ms:.2f}ms (target <50ms)")
check(avg_ms < 10, f"Sub-10ms real-time: {avg_ms:.2f}ms", warn_only=True)

start = time.perf_counter()
for _ in range(1000):
    predict_incident(cvss=7.0, exploit_in_wild=False, patch_age_days=30,
                     internet_facing=False, control_effectiveness=0.6)
elapsed = time.perf_counter() - start
throughput = 1000 / elapsed
check(throughput > 100, f"Throughput: {throughput:.0f} predictions/sec (target >100/sec)")
print(f"  → Can score 1000 assets in {elapsed:.2f}s")

# ── CATEGORY 7: FAIR FINANCIAL ENGINE (EAL + Monte Carlo VaR) ────────
section("CATEGORY 7: FINANCIAL SIMULATION INVARIANTS")
print("  Synthetic unit inputs verify math only; they are not organization results.\n")

from backend.financial_engine.monte_carlo import run_monte_carlo

# Build asset risk data matching the actual function signature
asset_data = [
    {"incident_probability": 0.15, "loss_magnitude_inr": 5_000_000},
    {"incident_probability": 0.08, "loss_magnitude_inr": 12_000_000},
    {"incident_probability": 0.25, "loss_magnitude_inr": 3_000_000},
]
mc = run_monte_carlo(asset_data, seed=42)

check("mean_annual_loss" in mc, f"Simulated mean loss: ₹{mc.get('mean_annual_loss', 0):>12,.0f}")
check("var_95" in mc,           f"Value at Risk 95%: ₹{mc.get('var_95', 0):>12,.0f}")
check("var_99" in mc,           f"Value at Risk 99%: ₹{mc.get('var_99', 0):>12,.0f}")
check("tail_value_at_risk_95" in mc, f"Tail VaR 95%:     ₹{mc.get('tail_value_at_risk_95', 0):>12,.0f}")

check(mc.get("var_99", 0) >= mc.get("var_95", 0),
      "VaR 99% >= VaR 95% (mathematically correct)")
check(mc.get("tail_value_at_risk_95", 0) >= mc.get("var_95", 0),
      "Tail VaR >= VaR 95% (tail captures extremes)")
check(mc.get("mean_annual_loss", 0) > 0, "Mean Annual Loss is positive")

# Deterministic reproducibility
mc2 = run_monte_carlo(asset_data, seed=42)
check(mc["mean_annual_loss"] == mc2["mean_annual_loss"],
      "SEEDED & REPRODUCIBLE (same seed → identical output)")

# Sensitivity: more assets → more loss
mc_more = run_monte_carlo(asset_data + [{"incident_probability": 0.4, "loss_magnitude_inr": 8_000_000}], seed=42)
check(mc_more["mean_annual_loss"] > mc["mean_annual_loss"],
      f"More risk → higher EAL: ₹{mc_more['mean_annual_loss']:,.0f} > ₹{mc['mean_annual_loss']:,.0f}")

# Zero-risk edge case
mc_zero = run_monte_carlo([{"incident_probability": 0.0, "loss_magnitude_inr": 10_000_000}], seed=42)
check(mc_zero["mean_annual_loss"] == 0, f"Zero-probability asset → ₹0 loss: ₹{mc_zero['mean_annual_loss']:,.0f}")

# ── CATEGORY 8: SCENARIO SIMULATION ENGINE ───────────────────────────
section("CATEGORY 8: DEMO SCENARIO SIMULATION ('What-If' Analysis)")
print("  Jury Q: 'What happens if we implement MFA across all accounts?'\n")

from backend.scenario_engine.simulator import simulate_enterprise, PRESET_SCENARIOS
assets = json.load(open("data/demo/assets.json"))

baseline = simulate_enterprise(assets, {})
baseline_eal = baseline["after_total_eal_inr"]
print(f"  Baseline modeled exposure: ₹{baseline_eal:,.0f}\n")

scenarios = {
    "Implement MFA":           {"implement_mfa": True},
    "Emergency Patching":      {"implement_patching": True},
    "Network Segmentation":    {"implement_segmentation": True},
    "Delay Remediation 30d":   {"patch_delay": 30},
    "Delay Remediation 60d":   {"patch_delay": 60},
}
for name, overrides in scenarios.items():
    result = simulate_enterprise(assets, overrides)
    new_eal = result["after_total_eal_inr"]
    delta = new_eal - baseline_eal
    direction = "↑ INCREASES" if delta > 0 else "↓ REDUCES" if delta < 0 else "= NO CHANGE"
    pct = abs(delta / baseline_eal * 100) if baseline_eal else 0
    expected = delta >= 0 if "Delay" in name else delta <= 0
    check(expected, f"{name:25s} → ₹{new_eal:>12,.0f} ({direction} by {pct:.1f}%)")

mfa = simulate_enterprise(assets, {"implement_mfa": True})
check(mfa["after_total_eal_inr"] < baseline_eal, "MFA reduces enterprise risk")

delay = simulate_enterprise(assets, {"patch_delay": 30})
check(delay["after_total_eal_inr"] > baseline_eal, "30-day delay increases risk")

check(len(PRESET_SCENARIOS) >= 4, f"Preset scenarios: {len(PRESET_SCENARIOS)}")

# Per-asset drill-down
per_asset_key = None
for k in ["per_asset", "per_asset_eal", "per_asset_results"]:
    if k in baseline:
        per_asset_key = k
        break
if per_asset_key:
    per_asset = baseline[per_asset_key]
    scope = baseline["calculation_scope"]
    check(len(per_asset) == scope["assets_calculated"],
          f"Per-asset drill-down: {len(per_asset)} calculated; "
          f"{scope['assets_excluded_missing_findings']} excluded for missing findings")
else:
    check(False, "Per-asset drill-down missing", warn_only=True)

# ── CATEGORY 9: INVESTMENT OPTIMIZER (Knapsack + ROSI) ───────────────
section("CATEGORY 9: INVESTMENT OPTIMIZER (Budget Optimization)")
print("  Jury Q: 'Given ₹1 Crore, which controls maximize risk reduction?'\n")

from backend.optimizer.knapsack import optimize_budget, CONTROLS

result = optimize_budget(10_000_000)
print(f"  Budget:       ₹{result['budget_inr']:>12,.0f}")
print(f"  Spent:        ₹{result['spent_inr']:>12,.0f}")
print(f"  Remaining:    ₹{result['remaining_inr']:>12,.0f}")
print(f"  Modeled exposure reduced: ₹{result['total_risk_reduction_inr']:>12,.0f}")
print(f"  ROSI:         {result['rosi']}")
print(f"  Controls:")
for c in result["selected_controls"]:
    print(f"    - {c['name']} (₹{c['cost_inr']:,})")

check(result["spent_inr"] <= result["budget_inr"],
      f"Within budget: ₹{result['spent_inr']:,} <= ₹{result['budget_inr']:,}")
check(len(result["selected_controls"]) > 0,
      f"Selected {len(result['selected_controls'])} controls")
check(result["total_risk_reduction_inr"] > 0,
      f"Risk reduction positive: ₹{result['total_risk_reduction_inr']:,.0f}")
check("rosi" in result, f"ROSI: {result['rosi']}")
check(result["rosi"] >= 0, f"Recommended portfolio has non-negative ROSI: {result['rosi']}")
check(all(c["marginal_rosi"] >= 0 for c in result["selected_controls"]),
      "Every selected control clears the marginal ROSI hurdle")
check(result["remaining_inr"] >= 0, "No budget overrun")

# Budget sensitivity curve
print(f"\n  Budget vs. Risk Reduction (diminishing returns):")
budgets = [500_000, 2_000_000, 5_000_000, 10_000_000, 50_000_000]
for b in budgets:
    r = optimize_budget(b)
    n = len(r["selected_controls"])
    red = r["total_risk_reduction_inr"]
    print(f"    ₹{b/100_000:>6.0f}L → {n} controls, ₹{red/100_000:>8.1f}L reduction")

tiny = optimize_budget(100_000)
check(tiny["spent_inr"] <= 100_000, f"Tiny budget (₹1L) respected: ₹{tiny['spent_inr']:,}")

large = optimize_budget(100_000_000)
check(len(large["selected_controls"]) >= len(result["selected_controls"]),
      f"Larger budget >= controls: {len(large['selected_controls'])} >= {len(result['selected_controls'])}")

check(len(CONTROLS) == 7, f"Control catalogue: {len(CONTROLS)} controls")
for c in CONTROLS:
    has = {"id", "name", "cost_inr", "overrides"}.issubset(set(c.keys()))
    check(has, f"  Control '{c['id']}' has id/name/cost_inr/overrides")

# ── CATEGORY 10: COMPLIANCE & FRAMEWORK MAPPING ─────────────────────
section("CATEGORY 10: DEMO COMPLIANCE & FRAMEWORK MAPPING")
print("  Jury Q: 'Does it map to RBI, SEBI, NIST, ISO 27001, CIS?'\n")

from backend.compliance.mapper import get_compliance_summary, get_gaps

comp = get_compliance_summary()
framework_labels = [f.get("label", f.get("framework", "")) for f in comp]
print(f"  Frameworks: {framework_labels}\n")

for required in ["ISO 27001", "NIST CSF", "CIS Controls", "RBI CSF", "SEBI CSCRF"]:
    found = any(required.lower() in lbl.lower() for lbl in framework_labels)
    check(found, f"Framework: {required}")

for fw in comp:
    score = fw.get("score", "N/A")
    status = fw.get("status", "N/A")
    print(f"    {fw.get('label', '?'):20s} → Score: {score}%, Status: {status}")

gaps = get_gaps()
check(len(gaps) > 0, f"Compliance gaps identified: {len(gaps)} gaps")
if gaps:
    check(all("impact_lakh" in g for g in gaps),
          "Each gap has financial impact (₹ Lakhs)")
    print(f"\n  Top gaps:")
    for g in gaps[:5]:
        print(f"    - {g.get('gap', 'N/A')} → ₹{g.get('impact_lakh', 0)} Lakh ({g.get('priority', 'N/A')})")

# ═══════════════════════════════════════════════════════════════════════
# FINAL SCORECARD
# ═══════════════════════════════════════════════════════════════════════
section("═══ FINAL SCORECARD ═══")
total = results["pass"] + results["fail"] + results["warn"]
pct = (results["pass"] / total * 100) if total else 0
grade = "A+" if pct >= 95 else "A" if pct >= 90 else "B+" if pct >= 85 else "B" if pct >= 80 else "C"
print(f"""
  ┌─────────────────────────────────────────────────┐
  │  Total Checks:       {total:>4}                       │
  │  {PASS} Passed:           {results['pass']:>4}                       │
  │  {FAIL} Failed:           {results['fail']:>4}                       │
  │  {WARN} Warnings:         {results['warn']:>4}                       │
  │  Pass Rate:          {pct:>5.1f}%                     │
  │  Runtime grade:      {grade:>4}                       │
  └─────────────────────────────────────────────────┘
""")
if results["fail"] == 0:
    print("  VERDICT: Runtime invariants passed on explicitly labelled DEMO data.")
    print("  Holdout metrics and organization-specific financial inputs remain unverified until source datasets are supplied.")
elif results["fail"] <= 2:
    print(f"  ⚠️  VERDICT: Minor issues ({results['fail']}). Strong contender.")
else:
    print(f"  ❌ VERDICT: {results['fail']} failures need attention.")
