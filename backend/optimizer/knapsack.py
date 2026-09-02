"""Investment optimizer — Greedy step-wise to handle overlapping benefits. Member 5."""
from backend.scenario_engine.simulator import simulate_enterprise
from backend.data_access import demo_mode_enabled, load_assets, load_control_catalog

DEMO_CONTROLS = [
    {"id": "mfa", "name": "MFA for all privileged accounts", "cost_inr": 1_500_000, "complexity": "Low", "time_weeks": 2, "overrides": {"implement_mfa": True}},
    {"id": "patching", "name": "Emergency patch deployment", "cost_inr": 800_000, "complexity": "Medium", "time_weeks": 1, "overrides": {"implement_patching": True}},
    {"id": "segmentation", "name": "Network micro-segmentation", "cost_inr": 3_000_000, "complexity": "High", "time_weeks": 6, "overrides": {"implement_segmentation": True}},
    {"id": "edr_expand", "name": "EDR rollout to all endpoints", "cost_inr": 2_000_000, "complexity": "Medium", "time_weeks": 3, "overrides": {"edr_expand": True}},
    {"id": "cloud_hard", "name": "Cloud configuration hardening", "cost_inr": 1_500_000, "complexity": "Medium", "time_weeks": 2, "overrides": {"cloud_hardening": True}},
    {"id": "backup", "name": "Immutable backup implementation", "cost_inr": 600_000, "complexity": "Low", "time_weeks": 1, "overrides": {"immutable_backup": True}},
    {"id": "training", "name": "Security awareness training", "cost_inr": 300_000, "complexity": "Low", "time_weeks": 2, "overrides": {"training": True}},
]
# Backward-compatible test/demo export. Runtime optimization uses the canonical
# catalogue loader, which requires approved persisted costs in live mode.
CONTROLS = DEMO_CONTROLS

def get_demo_assets():
    return load_assets()

def _greedy_select_with_overlap(
    budget_inr: float,
    assets: list,
    controls: list[dict],
    minimum_marginal_rosi: float = 0.0,
) -> list[dict]:
    remaining_budget = budget_inr
    selected_controls = []
    current_overrides = {}
    
    # Calculate baseline
    baseline_result = simulate_enterprise(assets, {})
    current_eal = baseline_result["after_total_eal_inr"]
    
    available = list(controls)
    
    while True:
        best_control = None
        best_rosi = float("-inf")
        best_reduction = 0
        
        for control in available:
            if control["cost_inr"] <= remaining_budget:
                test_overrides = {**current_overrides, **control["overrides"]}
                res = simulate_enterprise(assets, test_overrides)
                new_eal = res["after_total_eal_inr"]
                reduction = current_eal - new_eal
                cost = control["cost_inr"]
                
                candidate_rosi = (reduction - cost) / cost if cost > 0 else 0
                if candidate_rosi >= minimum_marginal_rosi and reduction > best_reduction:
                    best_reduction = reduction
                    best_control = control
                    best_rosi = candidate_rosi
                    
        if best_control and best_reduction > 0:
            selected_controls.append({
                **best_control,
                "risk_reduction_inr": best_reduction,
                "marginal_rosi": round(best_rosi, 4),
                "eal_before_control_inr": round(current_eal),
                "eal_after_control_inr": round(current_eal - best_reduction),
            })
            current_overrides.update(best_control["overrides"])
            remaining_budget -= best_control["cost_inr"]
            current_eal -= best_reduction
            available.remove(best_control)
        else:
            break
            
    return selected_controls

def optimize_budget(budget_inr: float, minimum_marginal_rosi: float = 0.0) -> dict:
    if budget_inr < 0:
        raise ValueError("budget_inr cannot be negative")
    assets = get_demo_assets()
    controls = load_control_catalog()
    selected = _greedy_select_with_overlap(
        budget_inr,
        assets,
        controls,
        minimum_marginal_rosi=minimum_marginal_rosi,
    )
    
    spent = sum(c["cost_inr"] for c in selected)
    total_reduction = sum(c.get("risk_reduction_inr", 0) for c in selected)
    rosi = round((total_reduction - spent) / spent, 2) if spent > 0 else 0
    
    baseline_result = simulate_enterprise(assets, {})
    baseline_eal = baseline_result["after_total_eal_inr"]
    
    reduction_pct = round(total_reduction / baseline_eal * 100, 1) if baseline_eal else 0
    return {
        "budget_inr": budget_inr,
        "spent_inr": spent,
        "total_spend_inr": spent,
        "remaining_inr": budget_inr - spent,
        "unused_budget_inr": budget_inr - spent,
        "selected_controls": selected,
        "total_reduction_inr": total_reduction,
        "total_risk_reduction_inr": total_reduction,
        "total_reduction_lakh": round(total_reduction / 100_000, 2),
        "risk_reduced_inr": total_reduction,
        "total_risk_reduction_pct": reduction_pct,
        "rosi": rosi,
        "rosi_pct": round(rosi * 100),
        "solver": "greedy_dynamic",
        "objective": "maximize dynamic marginal EAL reduction subject to budget and minimum marginal ROSI",
        "minimum_marginal_rosi": minimum_marginal_rosi,
        "rosi_formula": "(annual_eal_reduction_inr - implementation_cost_inr) / implementation_cost_inr",
        "calculation_provenance": {
            "risk_reduction": "recomputed by scenario engine after every selected control",
            "control_costs": "approved persisted LIVE catalogue" if not demo_mode_enabled() else "explicit bundled DEMO fixture",
            "fake_reduction_catalogue_used": False,
        },
        "payback_years": round(spent / total_reduction, 1) if total_reduction > 0 else None,
        "rosi_note": (
            "Positive ROI — controls pay for themselves within 1 year" if rosi >= 0
            else f"Controls pay back in {round(spent / total_reduction, 1)} years — standard for infrastructure security investments"
        ) if total_reduction > 0 else "No risk reduction achieved",
        "baseline_eal_inr": baseline_eal,
        "baseline_eal_lakh": round(baseline_eal / 100_000, 2),
    }
