"""AI Risk Advisor API — Member 4.

POST /api/assistant/query      {question} -> {answer, data, intent, engine}
GET  /api/assistant/forecast   90-day EAL trajectory (optional ?patch_delay=30)
GET  /api/assistant/anomalies  SIEM failed-login anomaly scan
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ai.assistant.query_engine import handle_query
from ai.tools import risk_tools, scenario_tools
from ml.anomaly_detection.detector import detect_anomalies
from ml.forecasting.trend import DEFAULT_DAILY_GROWTH_RATE, forecast_eal

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
def query(req: QueryRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=422, detail="question must not be empty")
    return handle_query(req.question.strip())


@router.get("/forecast")
def forecast(
    horizon_days: int = Query(90, ge=1, le=365),
    step_days: int = Query(15, ge=1, le=90),
    patch_delay: Optional[int] = Query(None, ge=0, le=365),
    daily_growth_rate: float = Query(DEFAULT_DAILY_GROWTH_RATE, gt=0, le=0.05),
):
    baseline = risk_tools.get_enterprise_summary().get("total_eal_inr", 0)
    delay_applied = None
    if patch_delay:
        sim = scenario_tools.simulate_patch_delay(patch_delay)
        # Apply the simulator's absolute delay impact to the risks-engine
        # baseline so both stay on one scale (their demo input tables differ).
        delta = sim.get("after_total_eal_inr", 0) - sim.get("before_total_eal_inr", 0)
        baseline += delta
        delay_applied = {
            "days": patch_delay,
            "impact_inr": round(delta),
            "simulator_before_total_eal_inr": sim.get("before_total_eal_inr"),
            "simulator_after_total_eal_inr": sim.get("after_total_eal_inr"),
        }
    result = forecast_eal(
        baseline,
        horizon_days=horizon_days,
        step_days=step_days,
        daily_growth_rate=daily_growth_rate,
    )
    result["intent"] = "risk_forecast"
    result["baseline_eal_inr"] = round(baseline)
    result["patch_delay_applied"] = delay_applied
    return result


@router.get("/anomalies")
def anomalies(include_llm_summary: bool = Query(True)):
    return detect_anomalies(include_llm_summary=include_llm_summary)
