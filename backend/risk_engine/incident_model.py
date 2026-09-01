"""
Telemetry-wide Incident Model
Combines probability from Vulnerability (XGBoost), IAM, SIEM, EDR, CSPM, and Exposure.
"""
from backend.risk_engine.likelihood import calculate_likelihood
from backend.controls.effectiveness import calculate_control_effectiveness

# Versioned control-to-risk mapping
CONTROL_MAPPINGS = {
    "v1": {
        "iam_weight": 0.25,
        "vuln_weight": 0.35,
        "siem_edr_weight": 0.20,
        "cspm_exposure_weight": 0.20
    }
}

def calculate_telemetry_incident_probability(asset: dict, findings: list, telemetry: dict, controls: dict, version="v1") -> dict:
    mappings = CONTROL_MAPPINGS.get(version, CONTROL_MAPPINGS["v1"])
    
    ce = calculate_control_effectiveness(controls)
    
    # 1. Vulnerability (using highest risk finding)
    vuln_prob = 0.05
    if findings:
        max_finding = max(findings, key=lambda f: f.get("cvss", 0))
        vuln_res = calculate_likelihood(
            max_finding.get("cvss", 7.5),
            max_finding.get("exploit_in_wild", False),
            max_finding.get("patch_age_days", 30),
            asset.get("internet_facing", False),
            ce,
            max_finding.get("threat_intel_active", False)
        )
        vuln_prob = vuln_res["incident_probability"]
        
    # 2. IAM Risk (based on MFA, over-permission)
    iam_risk = telemetry.get("iam", {}).get("risk_score", 0.1)
    
    # 3. SIEM / EDR (Active alerts)
    siem_risk = telemetry.get("siem", {}).get("alert_severity", 0.0)
    edr_risk = telemetry.get("edr", {}).get("alert_severity", 0.0)
    siem_edr_risk = max(siem_risk, edr_risk)
    
    # 4. CSPM / Exposure (Misconfigurations)
    cspm_risk = telemetry.get("cspm", {}).get("misconfig_score", 0.0)
    
    # Combine
    combined_prob = (
        vuln_prob * mappings["vuln_weight"] +
        iam_risk * mappings["iam_weight"] +
        siem_edr_risk * mappings["siem_edr_weight"] +
        cspm_risk * mappings["cspm_exposure_weight"]
    )
    
    return {
        "incident_probability": min(combined_prob, 0.99),
        "version": version,
        "components": {
            "vulnerability": vuln_prob,
            "iam": iam_risk,
            "siem_edr": siem_edr_risk,
            "cspm_exposure": cspm_risk
        },
        "evidence": {
            "findings_count": len(findings),
            "telemetry_sources": list(telemetry.keys())
        }
    }
