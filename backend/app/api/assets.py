from fastapi import APIRouter

router = APIRouter()

@router.get("")
def get_assets():
    return {"note": "owned by Member 2 — not yet merged", "assets": []}

@router.get("/{asset_id}")
def get_asset(asset_id: str):
    return {"note": "owned by Member 2 — not yet merged", "asset_id": asset_id}
