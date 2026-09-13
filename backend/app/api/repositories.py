from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection
from backend.repositories.platform import list_repositories

router = APIRouter()


@router.get("")
def repositories(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
                 user: AuthUser = Depends(require_security)):
    return list_repositories(user.organization_id, limit, offset)


@router.get("/{repository_id}")
def repository(repository_id: UUID, user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        row = db.execute(
            """SELECT repository_id AS id,external_id,full_name AS name,private,default_branch AS "defaultBranch",
                      html_url,archived,pushed_at AS "lastScan",raw
               FROM repositories WHERE organization_id=%s AND repository_id=%s""",
            (user.organization_id, repository_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Repository not found")
    return row
