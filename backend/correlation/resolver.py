"""
Resolves a raw finding's asset reference to a canonical asset_id
BEFORE normalization. normalize_finding() silently drops any raw
finding missing asset_id, so this must run first in the pipeline
or those findings are lost, not resolved.
"""
from typing import Optional


def resolve_asset(raw: dict, known_assets: dict) -> Optional[str]:
    """
    known_assets: dict keyed by asset_id -> asset record dict (expects
    'ip' and/or 'hostname' fields on each asset record).
    Returns a resolved asset_id, or None if it truly can't be matched.
    """
    asset_id = raw.get("asset_id")
    if asset_id and asset_id in known_assets:
        return asset_id

    ip = raw.get("ip") or raw.get("host_ip")
    if ip:
        for aid, asset in known_assets.items():
            if asset.get("ip") == ip:
                return aid

    hostname = raw.get("hostname")
    if hostname:
        hostname_lower = hostname.lower()
        for aid, asset in known_assets.items():
            if asset.get("hostname", "").lower() == hostname_lower:
                return aid

    return None


def resolve_all(raw_findings: list[dict], known_assets: dict) -> list[dict]:
    """
    Backfills asset_id on raw findings in place where possible.
    Findings that stay unresolved are passed through unchanged —
    normalize_finding() will drop them, which is correct: an
    unresolvable finding shouldn't silently attach to the wrong asset.
    """
    resolved = []
    for raw in raw_findings:
        if not raw.get("asset_id"):
            match = resolve_asset(raw, known_assets)
            if match:
                raw = {**raw, "asset_id": match}
        resolved.append(raw)
    return resolved