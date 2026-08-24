from fastapi import APIRouter
router = APIRouter()

@router.get("")
def get_findings():
    return {"findings": [], "total": 0, "status": "Member 1 — connect your data here"}

@router.get("/sources")
def get_sources():
    return []