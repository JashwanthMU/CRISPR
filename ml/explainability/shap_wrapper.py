"""Explainability wrapper.

V1: formats rule-based model contributions in a SHAP-style layout so the
advisor and frontend can render impact bars today.

V2 hook: once an XGBoost model is trained (post-prototype), plug
shap.TreeExplainer here — explain_contributions() keeps its signature.
"""

from typing import Optional

FEATURE_LABELS = {
    "exploit_availability": "Exploit availability",
    "network_exposure": "Internet exposure",
    "patch_latency": "Patch latency",
    "control_weakness": "Control weakness",
    "severity": "Technical severity",
}


def explain_contributions(contributions: dict) -> list[dict]:
    if not contributions:
        return []
    total = sum(abs(v) for v in contributions.values()) or 1.0
    ranked = sorted(contributions.items(), key=lambda kv: abs(kv[1]), reverse=True)
    return [
        {
            "feature": name,
            "label": FEATURE_LABELS.get(name, name.replace("_", " ").title()),
            "impact": round(value, 4),
            "share_pct": round(abs(value) / total * 100, 1),
            "direction": "increases_risk" if value >= 0 else "reduces_risk",
        }
        for name, value in ranked
    ]


def top_driver(contributions: dict) -> Optional[dict]:
    explanations = explain_contributions(contributions)
    return explanations[0] if explanations else None
