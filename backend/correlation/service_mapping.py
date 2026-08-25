from backend.correlation.assets_registry import KNOWN_ASSETS

def map_asset_to_service(asset_id: str) -> str:
    asset = KNOWN_ASSETS.get(asset_id)
    if asset:
        return asset.get("business_service", "Unmapped Service")
    return "Unmapped Service"