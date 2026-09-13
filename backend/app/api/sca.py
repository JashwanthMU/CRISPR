from fastapi import APIRouter, Depends, Query

from backend.app.auth import AuthUser, require_security
from backend.repositories.platform import list_sca

router = APIRouter()


@router.get("")
def findings(repo: str | None = None, limit: int = Query(100, ge=1, le=500),
             offset: int = Query(0, ge=0), user: AuthUser = Depends(require_security)):
    return list_sca(user.organization_id, repo, limit, offset)
