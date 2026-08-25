"""
Explain why a risk is high - contribution of each factor.
Returns list of {factor, points, direction}, sorted by |points| descending.
"""


def identify_risk_drivers(asset: dict, finding: dict, controls: dict) -> list[dict]:
    drivers = []

    if asset.get("internet_facing"):
        drivers.append({"factor": "Internet-facing asset", "points": 20, "direction": "up"})
    if asset.get("criticality", 0) >= 4:
        drivers.append({"factor": "Critical business service", "points": 18, "direction": "up"})
    if finding.get("source_type") == "BUG_BOUNTY":
        drivers.append({"factor": "Validated bug bounty finding", "points": 17, "direction": "up"})
    if finding.get("confidence", 0) >= 0.8:
        drivers.append({"factor": "Multi-source confirmed evidence", "points": 14, "direction": "up"})
    if controls.get("mfa_coverage", 1) < 0.7:
        points = round((1 - controls["mfa_coverage"]) * 18)
        drivers.append({"factor": f"MFA gap ({round(controls['mfa_coverage'] * 100)}% coverage)", "points": points, "direction": "up"})
    if controls.get("edr_coverage", 0) >= 0.9:
        drivers.append({"factor": "Full EDR coverage", "points": -8, "direction": "down"})
    if controls.get("waf_enabled"):
        drivers.append({"factor": "WAF protection active", "points": -6, "direction": "down"})
    if asset.get("criticality", 5) <= 1 and not asset.get("internet_facing"):
        drivers.append({"factor": "Isolated, low-value asset", "points": -20, "direction": "down"})

    return sorted(drivers, key=lambda x: abs(x["points"]), reverse=True)
