from backend.scenario_engine.simulator import simulate_enterprise
from backend.scenario_engine.risk_service import calculate_baseline

def test_dynamic_recomputation():
    assets = [{"asset_id": "A001", "name": "Payment Gateway", "type": "gateway", "data_classification": "pci", "internet_facing": True}]
    findings = {"A001": {"cvss": 8.5, "epss_score": 0.8, "epss_percentile": 0.95, "exploit_in_wild": True, "patch_age_days": 18, "threat_intel_active": True}}
    
    # Run MFA scenario
    result_mfa = simulate_enterprise(assets, {"implement_mfa": True}, findings_by_asset=findings)
    
    # Assert there is a reduction in EAL
    assert result_mfa["reduction_inr"] > 0
    assert result_mfa["before_total_eal_inr"] > result_mfa["after_total_eal_inr"]
    
    # Ensure it's not hardcoded (like CALIBRATED_IMPACTS) by verifying it depends on base inputs
    assets_low_val = [{"asset_id": "A001", "name": "Payment Gateway", "type": "internal", "data_classification": "public", "internet_facing": False}]
    result_mfa_low = simulate_enterprise(assets_low_val, {"implement_mfa": True}, findings_by_asset=findings)
    
    # The reduction for low value asset should be less than the high value one
    assert result_mfa["reduction_inr"] != result_mfa_low["reduction_inr"]

def test_baseline_shared_calculator():
    asset = {"asset_id": "A001", "name": "Payment Gateway", "type": "gateway", "data_classification": "pci", "internet_facing": True}
    finding = {"cvss": 8.5, "exploit_in_wild": True, "patch_age_days": 18, "threat_intel_active": True}
    controls = {}
    baseline = calculate_baseline(asset, finding, controls)
    assert baseline["eal_inr"] > 0


def test_patch_delay_compounds_exposure_and_discloses_formula():
    assets = [{"asset_id": "A001", "name": "Payment Gateway", "type": "gateway", "data_classification": "pci", "internet_facing": True}]
    finding = {
        "cvss": 9.8,
        "epss_score": 0.99,
        "epss_percentile": 0.99,
        "exploit_in_wild": True,
        "patch_age_days": 10,
    }
    baseline = simulate_enterprise(assets, {}, findings_by_asset={"A001": finding})
    delayed = simulate_enterprise(assets, {"patch_delay": 30}, findings_by_asset={"A001": finding})
    assert delayed["after_total_eal_inr"] > baseline["after_total_eal_inr"]
    calculation = delayed["per_asset"][0]["likelihood_calculation"]["calculation"]
    assert calculation["patch_delay_days"] == 30
    assert calculation["delay_formula"] == "1 - (1 - p) ** (1 + delay_days / 365)"
