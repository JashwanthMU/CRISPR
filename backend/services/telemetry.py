"""Transparent statistical anomaly screening over current tenant telemetry."""

import math
from datetime import datetime, timedelta, timezone

from backend.database.connection import get_connection


def detect_rate_anomalies(organization_id, event_type: str, lookback_days: int = 14,
                          recent_hours: int = 24, threshold_z: float = 3.0) -> dict:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=lookback_days)
    recent_start = now - timedelta(hours=recent_hours)
    with get_connection() as db:
        rows = db.execute(
            """SELECT COALESCE(asset_id,identity_id,'unattributed') AS subject,
                      COUNT(*) FILTER (WHERE observed_at >= %s) AS recent_count,
                      COUNT(*) FILTER (WHERE observed_at < %s) AS baseline_count,
                      MIN(observed_at) AS first_observed,MAX(observed_at) AS last_observed,
                      ARRAY_AGG(DISTINCT source_name) AS sources
               FROM telemetry_events WHERE organization_id=%s AND event_type=%s AND observed_at >= %s
               GROUP BY COALESCE(asset_id,identity_id,'unattributed')""",
            (recent_start, recent_start, organization_id, event_type, start),
        ).fetchall()
    baseline_hours = max((recent_start - start).total_seconds() / 3600, 1)
    results = []
    for row in rows:
        recent, baseline = int(row["recent_count"]), int(row["baseline_count"])
        expected = baseline / baseline_hours * recent_hours
        z_score = (recent - expected) / math.sqrt(max(expected, 1))
        results.append({"subject": row["subject"], "recent_count": recent,
                        "baseline_count": baseline, "expected_recent_count": round(expected, 3),
                        "z_score": round(z_score, 4), "is_anomaly": baseline >= 5 and z_score >= threshold_z,
                        "sources": row["sources"], "first_observed": row["first_observed"],
                        "last_observed": row["last_observed"]})
    anomalies = sorted((row for row in results if row["is_anomaly"]), key=lambda row: -row["z_score"])
    total_baseline = sum(row["baseline_count"] for row in results)
    return {"status": "ASSESSED" if total_baseline >= 5 else "NOT_ASSESSABLE",
            "event_type": event_type, "anomalies": anomalies, "subjects": results,
            "sample_count": total_baseline + sum(row["recent_count"] for row in results),
            "observation_window": {"start": start, "recent_start": recent_start, "end": now},
            "method": "Poisson rate z-score against the preceding observation window",
            "threshold_z": threshold_z,
            "limitations": ["A subject requires at least five baseline events to be flagged",
                            "This statistical signal is not proof of malicious activity"]}
