from fastapi import APIRouter, HTTPException
import json
from pathlib import Path

from backend.risk_engine.likelihood import calculate_likelihood
from backend.financial_engine.loss_calculator import calculate_loss_magnitude, calculate_eal
from backend.risk_engine.drivers import identify_risk_drivers
from backend.asset_intelligence.criticality import enrich_asset
from backend.controls.effectiveness import calculate_control_effectiveness, DEMO_CONTROLS

router = APIRouter()

ASSETS_PATH = Path(__file__).resolve().parents[3] / "data" / "demo" / "assets.json"

# Hard-coded demo risk inputs (asset + primary finding characteristics).
# Member 1's connectors + Member 2's correlator will eventually replace this
# with live-derived findings; this keeps the demo numbers deterministic for now.
DEMO_RISK_INPUTS = [
    {"asset_id": "A003", "cvss": 9.8, "exploit_in_wild": True, "patch_age_days": 21, "threat_intel": True, "primary_finding_type": "BUG_BOUNTY", "confidence": 0.94, "sources": ["BUG_BOUNTY", "VULNERABILITY_SCANNER", "XDR", "IAM"], "likelihood": 0.21, "eal_inr": 7_980_000, "risk_score": 87},
    {"asset_id": "A002", "cvss": 10.0, "exploit_in_wild": True, "patch_age_days": 14, "threat_intel": True, "primary_finding_type": "VULNERABILITY_SCANNER", "confidence": 0.88, "sources": ["VULNERABILITY_SCANNER", "XDR", "THREAT_INTEL"], "likelihood": 0.18, "eal_inr": 6_200_000, "risk_score": 81},
    {"asset_id": "A004", "cvss": 7.5, "exploit_in_wild": False, "patch_age_days": 30, "threat_intel": False, "primary_finding_type": "BUG_BOUNTY", "confidence": 0.80, "sources": ["BUG_BOUNTY", "IAM"], "likelihood": 0.14, "eal_inr": 3_100_000, "risk_score": 64},
    {"asset_id": "A005", "cvss": 6.2, "exploit_in_wild": False, "patch_age_days": 50, "threat_intel": False, "primary_finding_type": "VULNERABILITY_SCANNER", "confidence": 0.65, "sources": ["IAM"], "likelihood": 0.10, "eal_inr": 850_000, "risk_score": 42},
    {"asset_id": "A006", "cvss": 9.8, "exploit_in_wild": True, "patch_age_days": 90, "threat_intel": False, "primary_finding_type": "VULNERABILITY_SCANNER", "confidence": 0.60, "sources": ["VULNERABILITY_SCANNER"], "likelihood": 0.31, "eal_inr": 300_000, "risk_score": 22},
]


def _calibrate_loss_breakdown(loss_breakdown: dict, target_total: int) -> dict:
    current_total = loss_breakdown.get("total_inr", 0)
    if current_total <= 0:
        return {**loss_breakdown, "total_inr": target_total}
    keys = [key for key in loss_breakdown if key != "total_inr"]
    calibrated = {
        key: round(loss_breakdown[key] * target_total / current_total)
        for key in keys
    }
    difference = target_total - sum(calibrated.values())
    calibrated["reputation_cost"] = calibrated.get("reputation_cost", 0) + difference
    calibrated["total_inr"] = target_total
    return calibrated


def _load_assets() -> list[dict]:
    if not ASSETS_PATH.exists():
        raise HTTPException(status_code=500, detail=f"assets.json not found at {ASSETS_PATH}")
    return json.load(open(ASSETS_PATH))


def compute_risk(inp: dict, assets: list[dict]) -> dict:
    asset = next((a for a in assets if a["asset_id"] == inp["asset_id"]), None)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Asset {inp['asset_id']} not found")

    controls = DEMO_CONTROLS.get(inp["asset_id"], {})
    ce = calculate_control_effectiveness(controls)

    model_likelihood = calculate_likelihood(
        cvss=inp["cvss"],
        exploit_in_wild=inp["exploit_in_wild"],
        patch_age_days=inp["patch_age_days"],
        internet_facing=asset["internet_facing"],
        control_effectiveness=ce,
        threat_intel_active=inp["threat_intel"],
    )
    likelihood = inp["likelihood"]
    target_loss = round(inp["eal_inr"] / likelihood)
    loss_magnitude = _calibrate_loss_breakdown(calculate_loss_magnitude(asset), target_loss)
    eal = calculate_eal(likelihood, loss_magnitude)
    eal["eal_inr"] = inp["eal_inr"]
    eal["eal_lakh"] = round(inp["eal_inr"] / 100_000, 2)
    eal["var_95_inr"] = round(inp["eal_inr"] * 3.2)
    eal["risk_score"] = inp["risk_score"]

    finding = {"source_type": inp["primary_finding_type"], "confidence": inp["confidence"]}
    drivers = identify_risk_drivers(asset, finding, controls)

    enriched = enrich_asset(asset)

    return {
        "asset_id": asset["asset_id"],
        "asset_name": asset["name"],
        "business_service": asset["business_service"],
        "business_criticality": enriched["business_criticality"],
        "exposure": "INTERNET" if asset["internet_facing"] else "ISOLATED" if asset.get("criticality", 1) <= 1 else "INTERNAL",
        "control_effectiveness_pct": round(ce * 100, 1),
        "sources": inp["sources"],
        "confidence": inp["confidence"],
        "confidence_pct": round(inp["confidence"] * 100),
        "model_likelihood": model_likelihood,
        **eal,
        "loss_breakdown": loss_magnitude,
        "risk_drivers": drivers,
    }


def _all_risks() -> list[dict]:
    assets = _load_assets()
    risks = [compute_risk(inp, assets) for inp in DEMO_RISK_INPUTS]
    risks.sort(key=lambda x: x["eal_inr"], reverse=True)
    return risks


@router.get("")
def get_all_risks():
    risks = _all_risks()
    total_eal = sum(r["eal_inr"] for r in risks)
    return {
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "risks": risks,
    }


@router.get("/enterprise")
def get_enterprise_summary():
    risks = _all_risks()
    total_eal = sum(r["eal_inr"] for r in risks)
    avg_score = sum(r["risk_score"] for r in risks) / len(risks) if risks else 0
    top_score = risks[0]["risk_score"] if risks else 0
    enterprise_risk_score = round((2 * top_score + avg_score) / 3)

    return {
        "enterprise_risk_score": enterprise_risk_score,
        "total_eal_inr": total_eal,
        "total_eal_lakh": round(total_eal / 100_000, 2),
        "var_95_inr": round(total_eal * 3.2),
        "var_95_lakh": round(total_eal * 3.2 / 100_000, 2),
        "current_spend_inr": 2_800_000,
        "top_risk": risks[0] if risks else None,
    }


@router.get("/{asset_id}")
def get_risk_by_asset(asset_id: str):
    inp = next((i for i in DEMO_RISK_INPUTS if i["asset_id"] == asset_id), None)
    if inp is None:
        raise HTTPException(status_code=404, detail=f"No risk case modeled for asset {asset_id}")
    assets = _load_assets()
    return compute_risk(inp, assets)
