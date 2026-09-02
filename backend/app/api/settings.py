from fastapi import APIRouter
from pydantic import BaseModel
from backend.data_access import require_demo_mode

router = APIRouter()

class SettingsUpdate(BaseModel):
    org_name: str | None = None
    alert_email: str | None = None

_settings = {"org_name": "Acme Corp", "alert_email": "security@acme.com"}

@router.get("")
def get_settings():
    require_demo_mode("Settings")
    return _settings

@router.patch("")
def update_settings(body: SettingsUpdate):
    require_demo_mode("Settings")
    if body.org_name:
        _settings["org_name"] = body.org_name
    if body.alert_email:
        _settings["alert_email"] = body.alert_email
    return _settings
