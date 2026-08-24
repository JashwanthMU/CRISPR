# findings.py / assets.py / risks.py pattern:
from fastapi import APIRouter
router = APIRouter()

@router.get("")
def stub():
    return {"note": "owned by another member — not yet merged"}
