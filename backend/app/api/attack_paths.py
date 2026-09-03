from fastapi import APIRouter
from backend.data_access import require_demo_mode

router = APIRouter()

@router.get("")
def get_attack_paths():
    require_demo_mode("Attack paths")
    return [
        {"id": "ap-1", "start": "Internet", "target": "Database", "risk_score": 85},
    ]
