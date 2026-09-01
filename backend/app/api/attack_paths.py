from fastapi import APIRouter

router = APIRouter()

@router.get("")
def get_attack_paths():
    return [
        {"id": "ap-1", "start": "Internet", "target": "Database", "risk_score": 85},
    ]
