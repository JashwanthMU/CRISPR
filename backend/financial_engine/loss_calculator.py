from backend.constants import INDIA_PENALTIES, DOWNTIME_COST_PER_HOUR
from backend.financial_engine.monte_carlo import run_monte_carlo

def calculate_loss_magnitude(asset: dict) -> dict:
    asset_type = asset.get("type", "web_app")
    criticality = asset.get("criticality", 1) / 5
    is_regulated = asset.get("is_regulated", False)
    value_inr = asset.get("value_inr", 1_000_000)
    downtime_hours = round(4 + (criticality * 8))
    hourly_rate = DOWNTIME_COST_PER_HOUR.get(asset_type, 200_000)
    downtime_loss = downtime_hours * hourly_rate * criticality
    ir_cost = 300_000 + (criticality * 500_000)
    recovery_cost = 200_000 + (criticality * 600_000)
    data_breach = value_inr * 0.15 if asset.get("data_sensitivity", 1) >= 4 else 0
    regulatory = 0
    if is_regulated:
        regulatory = INDIA_PENALTIES["cert_in_non_reporting"] + INDIA_PENALTIES["rbi_non_reporting"]
        if asset.get("data_sensitivity", 1) >= 4:
            regulatory += INDIA_PENALTIES["dpdp_breach"] * 0.05
    reputation = value_inr * 0.08 * criticality
    total = downtime_loss + ir_cost + recovery_cost + data_breach + regulatory + reputation
    return {
        "downtime_loss": round(downtime_loss), "ir_cost": round(ir_cost),
        "recovery_cost": round(recovery_cost), "data_breach_cost": round(data_breach),
        "regulatory_cost": round(regulatory), "reputation_cost": round(reputation),
        "total_inr": round(total),
    }

def calculate_eal(likelihood: float, loss_magnitude: dict) -> dict:
    total_loss = loss_magnitude["total_inr"]
    eal = likelihood * total_loss
    return {
        "likelihood": likelihood,
        "loss_magnitude_inr": total_loss,
        "eal_inr": round(eal),
        "eal_lakh": round(eal / 100_000, 2),
        "risk_score": min(int(likelihood * 100 + (total_loss / 1_000_000)), 100),
    }

def calculate_enterprise_risk(assets_risk_data: list) -> dict:
    mc_results = run_monte_carlo(assets_risk_data)
    total_eal = sum(a.get("eal_inr", 0) for a in assets_risk_data)
    return {
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "monte_carlo": mc_results
    }
