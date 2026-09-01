from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class SettingsUpdate(BaseModel):
    org_name: str | None = None
    alert_email: str | None = None

_settings = {"org_name": "Acme Corp", "alert_email": "security@acme.com"}

@router.get("")
def get_settings():
    return _settings

@router.patch("")
def update_settings(body: SettingsUpdate):
    if body.org_name:
        _settings["org_name"] = body.org_name
    if body.alert_email:
        _settings["alert_email"] = body.alert_email
    return _settings
