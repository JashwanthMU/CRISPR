"""
Member 5 — Test Suite
Tests for: Scenario Engine, Budget Optimizer, Compliance Mapper, API Routers

Run: PYTHONPATH=. pytest backend/tests/test_member5.py -v
"""
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def assets():
    path = Path("data/demo/assets.json")
    with open(path) as f:
        return json.load(f)


@pytest.fixture
def client():
    from backend.app.main import app
    return TestClient(app)


# ══════════════════════════════════════════════════════════════════════════════
# 1. SCENARIO ENGINE
# ══════════════════════════════════════════════════════════════════════════════

class TestScenarioEngine:

    def test_mfa_reduction_hits_target(self, assets):
        """MFA scenario must reduce EAL by exactly ₹48.6L."""
        from backend.scenario_engine.simulator import simulate_enterprise
        result = simulate_enterprise(assets, {"implement_mfa": True})
        assert result["reduction_lakh"] == 48.6

    def test_patch_now_reduction_hits_target(self, assets):
        """Patch now must reduce EAL by exactly ₹31.0L."""
        from backend.scenario_engine.simulator import simulate_enterprise
        result = simulate_enterprise(assets, {"implement_patching": True})
        assert result["reduction_lakh"] == 31.0

    def test_segmentation_reduction_hits_target(self, assets):
        """Segmentation must reduce EAL by exactly ₹38.7L."""
        from backend.scenario_engine.simulator import simulate_enterprise
        result = simulate_enterprise(assets, {"implement_segmentation": True})
        assert result["reduction_lakh"] == 38.7

    def test_delay_30d_increases_risk(self, assets):
        """Delay 30 days must INCREASE EAL by ₹21.0L (negative reduction)."""
        from backend.scenario_engine.simulator import simulate_enterprise
        result = simulate_enterprise(assets, {"patch_delay": 30})
        assert result["reduction_lakh"] == -21.0

    def test_before_eal_is_positive(self, assets):
        """Baseline EAL must always be positive."""
        from backend.scenario_engine.simulator import simulate_enterprise
        result = simulate_enterprise(assets, {"implement_mfa": True})
        assert result["before_total_eal_inr"] > 0

    def test_per_asset_has_all_six_assets(self, assets):
        """Result must include all 6 assets."""
        from backend.scenario_engine.simulator import simulate_enterprise
        result = simulate_enterprise(assets, {"implement_mfa": True})
        assert len(result["per_asset"]) >= 6

    def test_preset_scenarios_exist(self):
        """All 4 presets must be defined."""
        from backend.scenario_engine.simulator import PRESET_SCENARIOS
        ids = [p["id"] for p in PRESET_SCENARIOS]
        assert "mfa" in ids
        assert "patch_now" in ids
        assert "segment" in ids
        assert "delay_30" in ids

    def test_combined_scenario(self, assets):
        """MFA + patching combined must reduce more than MFA alone."""
        from backend.scenario_engine.simulator import simulate_enterprise
        mfa_only = simulate_enterprise(assets, {"implement_mfa": True})
        combined = simulate_enterprise(assets, {
            "implement_mfa": True,
            "implement_patching": True
        })
        assert combined["reduction_inr"] > mfa_only["reduction_inr"]


# ══════════════════════════════════════════════════════════════════════════════
# 2. BUDGET OPTIMIZER
# ══════════════════════════════════════════════════════════════════════════════

class TestOptimizer:

    def test_optimizer_stays_within_budget(self):
        """Total spend must never exceed budget."""
        from backend.optimizer.knapsack import optimize_budget
        result = optimize_budget(5_000_000)
        assert result["spent_inr"] <= 5_000_000

    def test_optimizer_1cr_selects_controls(self):
        """₹1Cr budget must select at least 4 controls."""
        from backend.optimizer.knapsack import optimize_budget
        result = optimize_budget(10_000_000)
        assert len(result["selected_controls"]) >= 4

    def test_optimizer_reduction_positive(self):
        """Risk reduction must always be positive."""
        from backend.optimizer.knapsack import optimize_budget
        result = optimize_budget(10_000_000)
        assert result["total_reduction_inr"] > 0

    def test_optimizer_rosi_positive(self):
        """ROSI must be positive for any reasonable budget."""
        from backend.optimizer.knapsack import optimize_budget
        result = optimize_budget(10_000_000)
        assert result["rosi"] > 0

    def test_optimizer_tiny_budget(self):
        """Very small budget should still return a valid result."""
        from backend.optimizer.knapsack import optimize_budget
        result = optimize_budget(300_000)
        assert result["spent_inr"] <= 300_000
        assert len(result["selected_controls"]) >= 1

    def test_optimizer_remaining_budget_correct(self):
        """remaining_inr = budget - spent."""
        from backend.optimizer.knapsack import optimize_budget
        budget = 10_000_000
        result = optimize_budget(budget)
        assert result["remaining_inr"] == budget - result["spent_inr"]

    def test_controls_catalogue_has_seven(self):
        """Control catalogue must have exactly 7 controls."""
        from backend.optimizer.knapsack import CONTROLS
        assert len(CONTROLS) == 7

    def test_all_controls_have_required_fields(self):
        """Every control must have required fields."""
        from backend.optimizer.knapsack import CONTROLS
        required = {"id", "name", "cost_inr", "risk_reduction_inr", "complexity", "time_weeks"}
        for control in CONTROLS:
            missing = required - set(control.keys())
            assert not missing, f"Control {control.get('id')} missing: {missing}"


# ══════════════════════════════════════════════════════════════════════════════
# 3. COMPLIANCE MAPPER
# ══════════════════════════════════════════════════════════════════════════════

class TestCompliance:

    def test_five_frameworks_returned(self):
        """Must return exactly 5 frameworks."""
        from backend.compliance.mapper import get_compliance_summary
        assert len(get_compliance_summary()) == 5

    def test_rbi_csf_score_is_72(self):
        """RBI CSF must be 72%."""
        from backend.compliance.mapper import get_compliance_summary
        rbi = next(f for f in get_compliance_summary() if f["framework"] == "RBI_CSF")
        assert rbi["score"] == 72

    def test_cis_controls_highest(self):
        """CIS Controls must be highest at 85%."""
        from backend.compliance.mapper import get_compliance_summary
        cis = next(f for f in get_compliance_summary() if f["framework"] == "CIS_CONTROLS")
        assert cis["score"] == 85

    def test_all_frameworks_have_status(self):
        """Every framework must have a status field."""
        from backend.compliance.mapper import get_compliance_summary
        for f in get_compliance_summary():
            assert f["status"] in ("adequate", "needs_improvement", "critical")

    def test_five_gaps_returned(self):
        """Must return exactly 5 compliance gaps."""
        from backend.compliance.mapper import get_gaps
        assert len(get_gaps()) == 5

    def test_mfa_gap_has_highest_impact(self):
        """MFA gap must have the highest impact."""
        from backend.compliance.mapper import get_gaps
        gaps = sorted(get_gaps(), key=lambda g: g["impact_inr"], reverse=True)
        assert gaps[0]["control"] == "MFA"

    def test_all_gaps_have_impact_lakh(self):
        """Every gap must have impact_lakh > 0."""
        from backend.compliance.mapper import get_gaps
        for gap in get_gaps():
            assert gap["impact_lakh"] > 0


# ══════════════════════════════════════════════════════════════════════════════
# 4. API ROUTERS
# ══════════════════════════════════════════════════════════════════════════════

class TestScenarioAPI:

    def test_health_endpoint(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_presets_endpoint_returns_four(self, client):
        r = client.get("/api/scenarios/presets")
        assert r.status_code == 200
        assert r.json()["count"] == 4

    def test_presets_mfa_reduction_correct(self, client):
        r = client.get("/api/scenarios/presets")
        presets = r.json()["presets"]
        mfa = next(p for p in presets if p["id"] == "mfa")
        assert mfa["reduction_lakh"] == 48.6

    def test_scenario_mfa_query_param(self, client):
        r = client.get("/api/scenarios?implement_mfa=true")
        assert r.status_code == 200
        assert r.json()["reduction_lakh"] == 48.6

    def test_scenario_delay_query_param(self, client):
        r = client.get("/api/scenarios?patch_delay=30")
        assert r.status_code == 200
        assert r.json()["reduction_lakh"] == -21.0

    def test_scenario_by_id_mfa(self, client):
        r = client.get("/api/scenarios/mfa")
        assert r.status_code == 200
        assert "scenario" in r.json()

    def test_scenario_by_id_invalid(self, client):
        r = client.get("/api/scenarios/invalid_id")
        assert r.status_code == 200
        assert "error" in r.json()


class TestOptimizeAPI:

    def test_post_optimize(self, client):
        r = client.post("/api/optimize", json={"budget_inr": 10_000_000})
        assert r.status_code == 200
        data = r.json()
        assert "selected_controls" in data
        assert "rosi" in data

    def test_get_optimize_query_param(self, client):
        r = client.get("/api/optimize?budget=10000000")
        assert r.status_code == 200
        assert r.json()["spent_inr"] <= 10_000_000

    def test_optimize_controls_list(self, client):
        r = client.get("/api/optimize/controls")
        assert r.status_code == 200
        assert r.json()["count"] == 7


class TestComplianceAPI:

    def test_compliance_summary(self, client):
        r = client.get("/api/compliance")
        assert r.status_code == 200
        assert len(r.json()["frameworks"]) == 5

    def test_compliance_lowest_is_rbi(self, client):
        r = client.get("/api/compliance")
        assert r.json()["lowest"]["framework"] == "RBI_CSF"

    def test_compliance_gaps(self, client):
        r = client.get("/api/compliance/gaps")
        assert r.status_code == 200
        assert r.json()["count"] == 5

    def test_compliance_scores(self, client):
        r = client.get("/api/compliance/scores")
        assert r.status_code == 200
        scores = r.json()
        assert scores["RBI_CSF"] == 72
        assert scores["CIS_CONTROLS"] == 85
