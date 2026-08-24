"""Compliance mapping API. Member 5."""
from fastapi import APIRouter
from backend.compliance.mapper import get_compliance_summary, get_gaps, COMPLIANCE_SCORES

router = APIRouter()

@router.get("")
def compliance_summary():
    summary = get_compliance_summary()
    avg = round(sum(s["score"] for s in summary) / len(summary), 1) if summary else 0
    return {
        "frameworks": summary,
        "average_score": avg,
        "lowest": min(summary, key=lambda x: x["score"]) if summary else None,
        "highest": max(summary, key=lambda x: x["score"]) if summary else None,
    }

@router.get("/gaps")
def compliance_gaps():
    gaps = get_gaps()
    total_impact = sum(g["impact_inr"] for g in gaps)
    return {
        "gaps": gaps,
        "count": len(gaps),
        "total_impact_inr": total_impact,
        "total_impact_lakh": round(total_impact / 100_000, 2),
    }

@router.get("/scores")
def raw_scores():
    return COMPLIANCE_SCORES