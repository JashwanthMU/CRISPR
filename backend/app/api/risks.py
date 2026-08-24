from fastapi import APIRouter
router = APIRouter()

@router.get("")
def get_risks():
    return {"risks": [], "status": "Member 3 — connect risk engine here"}

@router.get("/enterprise")
def get_enterprise():
    return {"enterprise_risk_score": 0, "total_eal_inr": 0}