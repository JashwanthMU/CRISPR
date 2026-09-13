"""Compliance mapping backed by organization evidence in live mode."""
from fastapi import APIRouter, Depends
from backend.app.auth import AuthUser, require_security
from backend.compliance.mapper import get_compliance_summary, get_gaps, COMPLIANCE_SCORES
from backend.data_access import demo_mode_enabled
from backend.services.compliance import compliance_result

router = APIRouter()

@router.get("")
def compliance_summary(user: AuthUser = Depends(require_security)):
    summary = get_compliance_summary() if demo_mode_enabled(user.organization_id) else compliance_result(user.organization_id)["frameworks"]
    avg = round(sum(s["score"] for s in summary) / len(summary), 1) if summary else 0
    return {
        "frameworks": summary,
        "average_score": avg,
        "lowest": min(summary, key=lambda x: x["score"]) if summary else None,
        "highest": max(summary, key=lambda x: x["score"]) if summary else None,
    }

@router.get("/gaps")
def compliance_gaps(user: AuthUser = Depends(require_security)):
    gaps = get_gaps() if demo_mode_enabled(user.organization_id) else compliance_result(user.organization_id)["gaps"]
    total_impact = sum(g["impact_inr"] for g in gaps)
    return {
        "gaps": gaps,
        "count": len(gaps),
        "total_impact_inr": total_impact,
        "total_impact_lakh": round(total_impact / 100_000, 2),
    }

@router.get("/scores")
def raw_scores(user: AuthUser = Depends(require_security)):
    if demo_mode_enabled(user.organization_id):
        return COMPLIANCE_SCORES
    return {row["framework"]: row["score"] for row in compliance_result(user.organization_id)["frameworks"]}
