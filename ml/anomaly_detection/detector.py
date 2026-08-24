"""Isolation Forest login-anomaly detection over CRISPR SIEM demo data."""

import json
import random
from pathlib import Path
from statistics import fmean, pstdev
from typing import Optional

from sklearn.ensemble import IsolationForest


DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "demo"

HISTORY_DAYS = 30
RECENT_WINDOW_DAYS = 7
DEFAULT_CONTAMINATION = 0.15
RANDOM_STATE = 42

_BASELINE_RATE = 0.03
_BASELINE_STD = 0.012
_AUTH_TERMS = ("auth", "login", "credential", "brute")
_FEATURE_NAMES = (
    "historical_failure_rate",
    "recent_failure_rate",
    "failure_rate_change",
    "peak_daily_failure_rate",
    "auth_signal_count",
)


def _load_json(name: str) -> list[dict]:
    path = DATA_DIR / name
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def _siem_auth_signals(events: list[dict]) -> dict[str, int]:
    signals: dict[str, int] = {}
    for event in events:
        asset_id = event.get("asset_id")
        searchable = " ".join(
            str(event.get(field) or "").lower()
            for field in ("title", "finding_type")
        )
        if asset_id and any(term in searchable for term in _AUTH_TERMS):
            signals[asset_id] = signals.get(asset_id, 0) + 1
    return signals


def _daily_failure_rates(asset_id: str, auth_signal_count: int) -> list[float]:
    rng = random.Random(f"crispr-isolation-forest-{asset_id}")
    historical_days = HISTORY_DAYS - RECENT_WINDOW_DAYS
    historical = [
        max(0.001, rng.gauss(_BASELINE_RATE, _BASELINE_STD))
        for _ in range(historical_days)
    ]
    if auth_signal_count:
        spike_rate = min(0.28 + (auth_signal_count - 1) * 0.05, 0.60)
        recent = [
            max(0.02, min(0.99, rng.gauss(spike_rate, spike_rate / 7)))
            for _ in range(RECENT_WINDOW_DAYS)
        ]
    else:
        recent = [
            max(0.001, rng.gauss(_BASELINE_RATE, _BASELINE_STD))
            for _ in range(RECENT_WINDOW_DAYS)
        ]
    return historical + recent


def _asset_features(asset_id: str, auth_signal_count: int) -> dict:
    rates = _daily_failure_rates(asset_id, auth_signal_count)
    historical = rates[:-RECENT_WINDOW_DAYS]
    recent = rates[-RECENT_WINDOW_DAYS:]
    historical_rate = fmean(historical)
    recent_rate = fmean(recent)
    return {
        "asset_id": asset_id,
        "historical_failure_rate": historical_rate,
        "recent_failure_rate": recent_rate,
        "failure_rate_change": recent_rate - historical_rate,
        "peak_daily_failure_rate": max(rates),
        "auth_signal_count": auth_signal_count,
    }


def _effective_contamination(asset_count: int) -> float:
    if asset_count < 2:
        return DEFAULT_CONTAMINATION
    return min(0.25, max(DEFAULT_CONTAMINATION, 1 / asset_count))


def detect_anomalies(include_llm_summary: bool = True) -> dict:
    siem_events = _load_json("siem_events.json")
    auth_signals = _siem_auth_signals(siem_events)
    asset_ids = sorted(
        {
            asset.get("asset_id")
            for asset in _load_json("assets.json")
            if asset.get("asset_id")
        }
        | set(auth_signals)
    )
    feature_rows = [
        _asset_features(asset_id, auth_signals.get(asset_id, 0))
        for asset_id in asset_ids
    ]

    baseline_rates = [row["historical_failure_rate"] for row in feature_rows]
    baseline_mean = fmean(baseline_rates) if baseline_rates else 0.0
    baseline_std = max(pstdev(baseline_rates), 1e-6) if baseline_rates else 1e-6
    contamination = _effective_contamination(len(feature_rows))

    if len(feature_rows) >= 2:
        feature_matrix = [
            [float(row[name]) for name in _FEATURE_NAMES]
            for row in feature_rows
        ]
        model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=RANDOM_STATE,
        )
        predictions = model.fit_predict(feature_matrix)
        anomaly_scores = -model.decision_function(feature_matrix)
    else:
        predictions = [1] * len(feature_rows)
        anomaly_scores = [0.0] * len(feature_rows)

    assets_report = []
    for row, prediction, anomaly_score in zip(
        feature_rows, predictions, anomaly_scores
    ):
        recent_rate = row["recent_failure_rate"]
        assets_report.append(
            {
                "asset_id": row["asset_id"],
                "historical_failure_rate": round(row["historical_failure_rate"], 4),
                "recent_failure_rate": round(recent_rate, 4),
                "failure_rate_change": round(row["failure_rate_change"], 4),
                "peak_daily_failure_rate": round(row["peak_daily_failure_rate"], 4),
                "auth_signal_count": row["auth_signal_count"],
                "anomaly_score": round(float(anomaly_score), 4),
                "z_score": round((recent_rate - baseline_mean) / baseline_std, 2),
                "is_anomaly": int(prediction) == -1,
            }
        )

    anomalies = sorted(
        (row for row in assets_report if row["is_anomaly"]),
        key=lambda row: row["anomaly_score"],
        reverse=True,
    )
    result = {
        "model": "isolation_forest_v1",
        "training_mode": "runtime_unsupervised_fit",
        "window_days": RECENT_WINDOW_DAYS,
        "history_days": HISTORY_DAYS,
        "baseline_failure_rate": round(baseline_mean, 4),
        "contamination": round(contamination, 4),
        "feature_names": list(_FEATURE_NAMES),
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
                {
                    "asset_id": anomaly["asset_id"],
                    "recent_failure_rate": anomaly["recent_failure_rate"],
                    "anomaly_score": anomaly["anomaly_score"],
                }
                for anomaly in detection["anomalies"]
            ],
        }
        return chat(
            task="explain",
            system="You are CRISPR's anomaly analyst. Summarize the login anomalies in 2-3 sentences for a security manager. Use only the provided figures.",
            user=json.dumps(facts),
        )
    except Exception:
        return None


if __name__ == "__main__":
    print(json.dumps(detect_anomalies(), indent=2))
