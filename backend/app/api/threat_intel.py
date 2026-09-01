from fastapi import APIRouter

router = APIRouter()

@router.get("/actors")
def list_actors():
    return [
        {"id": "ta-1", "name": "Lazarus Group", "origin": "North Korea", "targets": ["Finance", "Crypto"]},
        {"id": "ta-2", "name": "APT29", "origin": "Russia", "targets": ["Government", "Tech"]},
    ]

@router.get("/campaigns")
def list_campaigns():
    return [
        {"id": "c-1", "name": "Operation Dream Job", "actor": "Lazarus Group"},
    ]
