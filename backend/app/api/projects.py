from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from backend.app.auth import AuthUser, require_security
from backend.repositories.platform import create_project, list_projects

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    environment: str = Field(default="production", pattern="^(production|staging|development|test)$")


@router.get("")
def projects(limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
             user: AuthUser = Depends(require_security)):
    return list_projects(user.organization_id, limit, offset)


@router.post("", status_code=status.HTTP_201_CREATED)
def create(body: ProjectCreate, user: AuthUser = Depends(require_security)):
    return create_project(user.organization_id, body.model_dump())
