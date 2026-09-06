"""AI Risk Advisor API.

POST /api/assistant/query      {question} -> {answer, data, intent, engine}
GET  /api/assistant/forecast   90-day EAL trajectory (optional ?patch_delay=30)
GET  /api/assistant/anomalies  SIEM failed-login anomaly scan
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ai.assistant.query_engine import handle_query
from ai.tools import risk_tools, scenario_tools
from ml.anomaly_detection.detector import detect_anomalies
from ml.forecasting.trend import DEFAULT_DAILY_GROWTH_RATE, forecast_eal
from backend.app.auth import AuthUser, require_security
from backend.data_access import require_demo_mode, demo_mode_enabled
from backend.services.telemetry import detect_rate_anomalies

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
def query(req: QueryRequest, user: AuthUser = Depends(require_security)):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=422, detail="question must not be empty")
    return handle_query(req.question.strip(), user.organization_id)


@router.get("/forecast")
def forecast(
    horizon_days: int = Query(90, ge=1, le=365),
    step_days: int = Query(15, ge=1, le=90),
    patch_delay: Optional[int] = Query(None, ge=0, le=365),
    daily_growth_rate: float = Query(DEFAULT_DAILY_GROWTH_RATE, gt=0, le=0.05),
    user: AuthUser = Depends(require_security),
):
    require_demo_mode("Assumption-based risk projection")
    baseline = risk_tools.get_enterprise_summary(user.organization_id).get("total_eal_inr", 0)
    delay_applied = None
    if patch_delay:
        sim = scenario_tools.simulate_patch_delay(patch_delay, user.organization_id)
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
    result["source"] = "risk_engine"
    return result


@router.get("/anomalies")
def anomalies(
    include_llm_summary: bool = Query(True),
    event_type: str = Query("authentication_failure", min_length=1, max_length=120),
    lookback_days: int = Query(14, ge=2, le=365),
    recent_hours: int = Query(24, ge=1, le=168),
    threshold_z: float = Query(3.0, ge=1, le=10),
    user: AuthUser = Depends(require_security),
):
    if demo_mode_enabled():
        return detect_anomalies(include_llm_summary=include_llm_summary)
    return detect_rate_anomalies(user.organization_id, event_type, lookback_days, recent_hours, threshold_z)
