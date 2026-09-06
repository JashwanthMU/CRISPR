"""Risk tools — the AI's access to the risk engine.

Thin wrappers around GET /api/risks, /api/risks/enterprise and
/api/risks/{asset_id}. In-process calls keep the prototype deterministic
and testable; signatures mirror the HTTP contracts so a switch to httpx
calls later changes nothing upstream.
"""

from typing import Optional

from backend.app.api import risks as risk_api


def get_all_risks(organization_id) -> dict:
    risks = risk_api._all_risks(organization_id)
    return {"risks": risks, "count": len(risks)}


def get_enterprise_summary(organization_id) -> dict:
    return risk_api.calculate_enterprise_summary(organization_id)


def get_asset_risk(asset_id: str, organization_id) -> Optional[dict]:
    try:
        rows = [
            risk_api.compute_risk(row, risk_api._load_assets(organization_id), organization_id=organization_id)
            for row in risk_api._load_risk_inputs(organization_id)
            if row["asset_id"] == asset_id
        ]
        return max(rows, key=lambda row: row["eal_inr"]) if rows else None
    except Exception:
        return None


def get_top_risk(organization_id) -> Optional[dict]:
    risks = get_all_risks(organization_id).get("risks", [])
    return risks[0] if risks else None


def find_risk_by_question(question: str, organization_id) -> Optional[dict]:
    """Fuzzy-match an asset mentioned in the question ('Auth API', 'payment database')."""
    question_lower = question.lower()
    for risk in get_all_risks(organization_id).get("risks", []):
        name = (risk.get("asset_name") or "").lower()
        tokens = [t for t in name.replace("-", " ").split() if len(t) > 2]
        full_match = any(token in question_lower for token in tokens)
        prefix_match = any(token[:4] in question_lower for token in tokens if len(token) >= 4)
        if full_match or prefix_match:
            return risk
    asset_id = next((aid for aid in ("A001", "A002", "A003", "A004", "A005", "A006") if aid.lower() in question_lower), None)
    if asset_id:
        return get_asset_risk(asset_id, organization_id)
    return None
