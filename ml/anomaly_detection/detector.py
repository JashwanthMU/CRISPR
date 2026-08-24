"""Login-anomaly detection over SIEM demo data.

V1 (no training): builds a deterministic daily failed-login-rate series per
asset, anchored to the real SIEM/XDR signals in data/demo, then flags assets
whose recent-window failure rate is a statistical outlier (z-score) versus
the fleet baseline. An optional LLM narration is appended only when the
router is reachable — the detection itself never depends on it.

V2 plan: replace the z-score layer with a fitted IsolationForest /
XGBoost model behind the same detect_anomalies() signature.
"""

import json
import random
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "demo"

HISTORY_DAYS = 30
RECENT_WINDOW_DAYS = 7
Z_THRESHOLD = 3.0
RATE_THRESHOLD = 0.15

_BASELINE_RATE = 0.03
_BASELINE_STD = 0.012


def _load_json(name: str) -> list:
    path = DATA_DIR / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def _anchor_assets_from_siem() -> dict:
    """Derive spike anchors from real SIEM/XDR findings.

    A003 carries correlated auth-failure alerts (SIEM001 + XDR001, 347 failed
    attempts), so it gets a strong recent spike. Any other asset with an
    auth/login-flavoured finding gets a mild elevation. Everything else sits
    at the fleet baseline.
    """
    anchors: dict[str, float] = {}
    for filename in ("siem_events.json", "xdr_events.json"):
        for event in _load_json(filename):
            asset_id = event.get("asset_id")
            title = (event.get("title") or "").lower()
            ftype = (event.get("finding_type") or "").lower()
            auth_related = any(k in title or k in ftype for k in ("auth", "login", "brute"))
            if asset_id and auth_related:
                anchors[asset_id] = max(anchors.get(asset_id, 0.0), 0.28)
    return anchors


def _daily_series(asset_id: str, spike_rate: Optional[float]) -> list[float]:
    rng = random.Random(f"crispr-{asset_id}")
    history_end = HISTORY_DAYS - RECENT_WINDOW_DAYS
    if not spike_rate:
        return [max(0.001, rng.gauss(_BASELINE_RATE, _BASELINE_STD)) for _ in range(HISTORY_DAYS)]
    series = [max(0.001, rng.gauss(_BASELINE_RATE * 1.5, _BASELINE_STD)) for _ in range(history_end)]
    series += [max(0.02, rng.gauss(spike_rate, spike_rate / 6)) for _ in range(RECENT_WINDOW_DAYS)]
    return series


def detect_anomalies(include_llm_summary: bool = True) -> dict:
    siem_events = _load_json("siem_events.json")
    anchors = _anchor_assets_from_siem()
    asset_ids = sorted({a.get("asset_id") for a in _load_json("assets.json")} |
                       {e.get("asset_id") for e in siem_events} | set(anchors))

    series_by_asset = {aid: _daily_series(aid, anchors.get(aid)) for aid in asset_ids if aid}

    history_rates = [rate for rates in series_by_asset.values() for rate in rates[:HISTORY_DAYS - RECENT_WINDOW_DAYS]]
    baseline_mean = sum(history_rates) / len(history_rates)
    variance = sum((r - baseline_mean) ** 2 for r in history_rates) / len(history_rates)
    baseline_std = max(variance ** 0.5, 1e-6)

    assets_report = []
    for asset_id, series in sorted(series_by_asset.items()):
        recent = series[-RECENT_WINDOW_DAYS:]
        recent_mean = sum(recent) / len(recent)
        z_score = (recent_mean - baseline_mean) / baseline_std
        is_anomaly = z_score >= Z_THRESHOLD or recent_mean >= RATE_THRESHOLD
        assets_report.append({
            "asset_id": asset_id,
            "recent_failure_rate": round(recent_mean, 4),
            "baseline_failure_rate": round(baseline_mean, 4),
            "z_score": round(z_score, 2),
            "peak_daily_rate": round(max(series), 4),
            "is_anomaly": is_anomaly,
        })

    anomalies = [a for a in assets_report if a["is_anomaly"]]
    result = {
        "model": "zscore_v1",
        "window_days": RECENT_WINDOW_DAYS,
        "history_days": HISTORY_DAYS,
        "baseline_failure_rate": round(baseline_mean, 4),
        "z_threshold": Z_THRESHOLD,
        "siem_events_considered": len(siem_events),
        "anomalies": anomalies,
        "assets": assets_report,
    }

    if include_llm_summary and anomalies:
        result["llm_summary"] = _narrate(result)
    return result


def _narrate(detection: dict) -> Optional[str]:
    try:
        from ai.tools.llm import chat, is_available
        if not is_available():
            return None
        facts = {
            "baseline_failure_rate": detection["baseline_failure_rate"],
            "anomalies": [
                {"asset_id": a["asset_id"], "recent_failure_rate": a["recent_failure_rate"],
                 "z_score": a["z_score"]}
                for a in detection["anomalies"]
            ],
        }
        return chat(
            task="explain",
            system="You are CRISPR's anomaly analyst. Summarize the login anomalies in 2-3 "
                   "sentences for a security manager. Use ONLY the numbers provided; do not invent any.",
            user=json.dumps(facts),
        )
    except Exception:
        return None


if __name__ == "__main__":
    print(json.dumps(detect_anomalies(), indent=2))
