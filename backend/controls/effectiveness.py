def calculate_control_effectiveness(controls: dict) -> float:
    score = 0.0
    score += controls.get("mfa_coverage", 0) * 0.25
    score += controls.get("edr_coverage", 0) * 0.20
    score += (1 if controls.get("waf_enabled") else 0) * 0.15
    score += controls.get("patch_compliance", 0) * 0.20
    score += controls.get("segmentation", 0) * 0.15
    score += controls.get("logging_coverage", 0) * 0.05
    return round(min(score, 0.95), 3)

DEMO_CONTROLS = {
    "A001": {"mfa_coverage": 0.80, "edr_coverage": 1.0, "waf_enabled": True, "patch_compliance": 0.75, "segmentation": 0.40, "logging_coverage": 0.92},
    "A002": {"mfa_coverage": 0.90, "edr_coverage": 0.80, "waf_enabled": False, "patch_compliance": 0.51, "segmentation": 0.35, "logging_coverage": 0.85},
    "A003": {"mfa_coverage": 0.58, "edr_coverage": 1.0, "waf_enabled": True, "patch_compliance": 0.60, "segmentation": 0.40, "logging_coverage": 0.92},
    "A004": {"mfa_coverage": 0.70, "edr_coverage": 0.90, "waf_enabled": True, "patch_compliance": 0.65, "segmentation": 0.60, "logging_coverage": 0.80},
    "A005": {"mfa_coverage": 0.40, "edr_coverage": 0.70, "waf_enabled": False, "patch_compliance": 0.70, "segmentation": 0.80, "logging_coverage": 0.60},
    "A006": {"mfa_coverage": 0.20, "edr_coverage": 0.50, "waf_enabled": False, "patch_compliance": 0.30, "segmentation": 0.90, "logging_coverage": 0.40},
}
