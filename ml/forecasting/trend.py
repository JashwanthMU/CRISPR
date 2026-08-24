"""Deterministic EAL trend forecasting. Member 4.

Projects the do-nothing Expected Annual Loss trajectory over a horizon.
Pure arithmetic — no model training. A fitted/V2 model can replace
generate_trend later behind the same signature.
"""

from typing import Optional

DEFAULT_DAILY_GROWTH_RATE = 0.0077
DEFAULT_HORIZON_DAYS = 90
DEFAULT_STEP_DAYS = 15


def generate_trend(
    base_eal_inr: float,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    step_days: int = DEFAULT_STEP_DAYS,
    daily_growth_rate: float = DEFAULT_DAILY_GROWTH_RATE,
) -> list[dict]:
    if base_eal_inr < 0:
        raise ValueError("base_eal_inr must be non-negative")
    if horizon_days <= 0 or step_days <= 0:
        raise ValueError("horizon_days and step_days must be positive")

    points = []
    for day in range(0, horizon_days + 1, step_days):
        projected = base_eal_inr * ((1 + daily_growth_rate) ** day)
        points.append({"day": day, "eal_inr": round(projected)})
    if points[-1]["day"] != horizon_days:
        projected = base_eal_inr * ((1 + daily_growth_rate) ** horizon_days)
        points.append({"day": horizon_days, "eal_inr": round(projected)})
    return points


def summarize_trend(trend: list[dict]) -> dict:
    start, end = trend[0], trend[-1]
    increase = end["eal_inr"] - start["eal_inr"]
    increase_pct = round(increase / start["eal_inr"] * 100, 1) if start["eal_inr"] > 0 else 0
    return {
        "start_day": start["day"],
        "end_day": end["day"],
        "start_eal_inr": start["eal_inr"],
        "end_eal_inr": end["eal_inr"],
        "increase_inr": round(increase),
        "increase_pct": increase_pct,
    }


def forecast_eal(
    base_eal_inr: float,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    step_days: int = DEFAULT_STEP_DAYS,
    daily_growth_rate: float = DEFAULT_DAILY_GROWTH_RATE,
) -> dict:
    trend = generate_trend(base_eal_inr, horizon_days, step_days, daily_growth_rate)
    return {
        "base_eal_inr": round(base_eal_inr),
        "horizon_days": horizon_days,
        "step_days": step_days,
        "daily_growth_rate": daily_growth_rate,
        "trend": trend,
        "summary": summarize_trend(trend),
    }
