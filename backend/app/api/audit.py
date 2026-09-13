from fastapi import APIRouter, Depends, Query

from backend.app.auth import AuthUser, require_security
from backend.database.connection import get_connection

router = APIRouter()


@router.get("")
def events(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
           user: AuthUser = Depends(require_security)):
    with get_connection() as db:
        rows = db.execute(
            """SELECT audit_event_id AS id,actor_id,action,resource_type,resource_id,details,ip_address,created_at
               FROM audit_events WHERE organization_id=%s ORDER BY created_at DESC LIMIT %s OFFSET %s""",
            (user.organization_id, limit, offset),
        ).fetchall()
    return {"audit_events": rows, "limit": limit, "offset": offset}
