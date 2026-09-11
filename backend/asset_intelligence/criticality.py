"""
Business criticality score (0-100) from asset attributes.
Weights match the problem statement.
"""

WEIGHTS = {
    "criticality":        0.30,
    "data_sensitivity":   0.20,
    "revenue_dependency": 0.20,
    "regulatory":         0.15,
    "internet_facing":    0.15,
}

def calculate_business_criticality(asset: dict) -> float:
    return round(sum(item["contribution"] for item in criticality_breakdown(asset).values()), 1)

def criticality_breakdown(asset: dict) -> dict:
    """Return the five disclosed component scores that sum to criticality."""
    values = {
        "business_importance": (asset.get("criticality", 1) / 5, WEIGHTS["criticality"]),
        "data_sensitivity": (asset.get("data_sensitivity", 1) / 5, WEIGHTS["data_sensitivity"]),
        "revenue_dependency": (asset.get("revenue_dependency", 1) / 5, WEIGHTS["revenue_dependency"]),
        "regulatory_scope": (1 if asset.get("is_regulated") else 0, WEIGHTS["regulatory"]),
        "internet_exposure": (1 if asset.get("internet_facing") else 0, WEIGHTS["internet_facing"]),
    }
    return {
        name: {
            "normalized_value": round(value, 2),
            "weight": weight,
            "contribution": round(value * weight * 100, 1),
        }
        for name, (value, weight) in values.items()
    }

def enrich_asset(asset: dict) -> dict:
    return {
        **asset,
        "business_criticality": calculate_business_criticality(asset),
        "criticality_breakdown": criticality_breakdown(asset),
    }
