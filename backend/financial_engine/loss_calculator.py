from backend.constants import DOWNTIME_COST_PER_HOUR
from backend.data_access import LiveDataUnavailable, demo_mode_enabled
from backend.financial_engine.monte_carlo import run_monte_carlo

def calculate_loss_magnitude(asset: dict) -> dict:
    required_live_fields = {
        "type", "criticality", "data_sensitivity", "value_inr",
        "downtime_cost_per_hour_inr", "regulatory_exposure_inr",
    }
    if not demo_mode_enabled():
        required_live_fields.update({
            "expected_downtime_hours", "incident_response_cost_inr",
            "recovery_cost_inr", "data_breach_exposure_inr",
            "reputation_exposure_inr",
        })
    missing = sorted(field for field in required_live_fields if asset.get(field) is None)
    if missing and not demo_mode_enabled():
        raise LiveDataUnavailable(
            f"Asset {asset.get('asset_id', '<unknown>')} lacks financial inputs: {', '.join(missing)}"
        )
    asset_type = asset.get("type", "web_app")
    criticality = asset.get("criticality", 1) / 5
    is_regulated = asset.get("is_regulated", False)
    value_inr = asset.get("value_inr", 1_000_000)
    downtime_hours = (
        round(4 + (criticality * 8)) if demo_mode_enabled()
        else asset["expected_downtime_hours"]
    )
    hourly_rate = asset.get(
        "downtime_cost_per_hour_inr",
        DOWNTIME_COST_PER_HOUR.get(asset_type, 200_000),
    )
    downtime_loss = downtime_hours * hourly_rate * criticality
    ir_cost = (
        300_000 + (criticality * 500_000) if demo_mode_enabled()
        else asset["incident_response_cost_inr"]
    )
    recovery_cost = (
        200_000 + (criticality * 600_000) if demo_mode_enabled()
        else asset["recovery_cost_inr"]
    )
    data_breach = (
        value_inr * 0.15 if asset.get("data_sensitivity", 1) >= 4 else 0
    ) if demo_mode_enabled() else asset["data_breach_exposure_inr"]
    # A statutory maximum is not an expected fine. Live calculations require
    # an organization-approved expected exposure rather than inventing one
    # from legal penalty caps.
    regulatory = asset.get("regulatory_exposure_inr", 0) if is_regulated else 0
    reputation = (
        value_inr * 0.08 * criticality if demo_mode_enabled()
        else asset["reputation_exposure_inr"]
    )
    total = downtime_loss + ir_cost + recovery_cost + data_breach + regulatory + reputation
    return {
        "downtime_loss": round(downtime_loss), "ir_cost": round(ir_cost),
        "recovery_cost": round(recovery_cost), "data_breach_cost": round(data_breach),
        "regulatory_cost": round(regulatory), "reputation_cost": round(reputation),
        "total_inr": round(total),
        "calculation": {
            "criticality_fraction": criticality,
            "downtime_hours": downtime_hours,
            "downtime_cost_per_hour_inr": hourly_rate,
            "asset_value_inr": value_inr,
            "incident_response_cost_source": "demo formula" if demo_mode_enabled() else "asset.incident_response_cost_inr",
            "recovery_cost_source": "demo formula" if demo_mode_enabled() else "asset.recovery_cost_inr",
            "data_breach_cost_source": "demo formula" if demo_mode_enabled() else "asset.data_breach_exposure_inr",
            "reputation_cost_source": "demo formula" if demo_mode_enabled() else "asset.reputation_exposure_inr",
            "regulatory_exposure_source": (
                "asset.regulatory_exposure_inr"
                if asset.get("regulatory_exposure_inr") is not None
                else "demo assumption: zero"
            ),
            "data_mode": "demo" if demo_mode_enabled() else "live",
        },
    }

def calculate_eal(likelihood: float, loss_magnitude: dict) -> dict:
    if not 0 <= likelihood <= 1:
        raise ValueError("annual incident probability must be between 0 and 1")
    total_loss = loss_magnitude["total_inr"]
    if total_loss < 0:
        raise ValueError("loss magnitude cannot be negative")
    eal = likelihood * total_loss
    return {
        "likelihood": likelihood,
        "loss_magnitude_inr": total_loss,
        "eal_inr": round(eal),
        "eal_lakh": round(eal / 100_000, 2),
        "risk_score": min(int(likelihood * 100 + (total_loss / 1_000_000)), 100),
        "eal_calculation": {
            "formula": "annual_incident_probability * loss_magnitude_inr",
            "annual_incident_probability": likelihood,
            "loss_magnitude_inr": total_loss,
            "unrounded_eal_inr": eal,
        },
    }

def calculate_enterprise_risk(assets_risk_data: list) -> dict:
    mc_results = run_monte_carlo(assets_risk_data)
    total_eal = sum(a.get("eal_inr", 0) for a in assets_risk_data)
    return {
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "monte_carlo": mc_results
    }
