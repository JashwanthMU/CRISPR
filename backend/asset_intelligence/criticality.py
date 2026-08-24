"""
Business criticality score (0-100) from asset attributes.

*** TEMPORARY IMPLEMENTATION ***
Owned by ishwarya. Stubbed here so I'm risk engine is unblocked.
ishwarya: replace/extend this directly - keep enrich_asset(asset)->dict stable.
"""

WEIGHTS = {
    "criticality":        0.30,
    "data_sensitivity":   0.20,
    "revenue_dependency": 0.20,
    "regulatory":         0.15,
    "internet_facing":    0.15,
}


def calculate_business_criticality(asset: dict) -> float:
    score = asset.get("criticality", 1) / 5 * WEIGHTS["criticality"]
    score += asset.get("data_sensitivity", 1) / 5 * WEIGHTS["data_sensitivity"]
    score += asset.get("revenue_dependency", 1) / 5 * WEIGHTS["revenue_dependency"]
    score += (1 if asset.get("is_regulated") else 0) * WEIGHTS["regulatory"]
    score += (1 if asset.get("internet_facing") else 0) * WEIGHTS["internet_facing"]
    return round(score * 100, 1)


def enrich_asset(asset: dict) -> dict:
    return {**asset, "business_criticality": calculate_business_criticality(asset)}