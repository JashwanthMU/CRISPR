from fastapi import APIRouter, Depends, Query
from backend.app.auth import AuthUser, require_security
from backend.data_access import demo_mode_enabled
from backend.services.attack_paths import calculate_attack_paths

router = APIRouter()

@router.get("")
def get_attack_paths(max_depth: int = Query(8, ge=1, le=20), user: AuthUser = Depends(require_security)):
    if demo_mode_enabled(user.organization_id):
        return [{"id": "ap-1", "start": "Internet", "target": "Database", "risk_score": 85}]
    return calculate_attack_paths(user.organization_id, max_depth=max_depth)
