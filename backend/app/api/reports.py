"""
Reports API — feat/platform-connections
GET /api/reports           → list available reports
GET /api/reports/{id}      → get report detail + data
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter()

REPORTS = [
    {
        "id":          "rep-001",
        "name":        "Enterprise Risk Summary — August 2026",
        "description": "Full EAL breakdown, top risk cases, and remediation status.",
        "type":        "RISK_SUMMARY",
        "format":      "JSON",
        "generated":   "2026-08-31",
        "size_kb":     48,
        "frameworks":  ["ISO_27001", "RBI_CSF"],
    },
    {
        "id":          "rep-002",
        "name":        "RBI CSF Compliance Report — Q3 2026",
        "description": "Compliance posture against RBI Cyber Security Framework controls.",
        "type":        "COMPLIANCE",
        "format":      "JSON",
        "generated":   "2026-08-15",
        "size_kb":     32,
        "frameworks":  ["RBI_CSF"],
    },
    {
        "id":          "rep-003",
        "name":        "Weekly Findings Digest — Week 34",
        "description": "New findings, severity distribution, and source breakdown.",
        "type":        "FINDINGS_DIGEST",
        "format":      "JSON",
        "generated":   "2026-08-22",
        "size_kb":     18,
        "frameworks":  [],
    },
    {
        "id":          "rep-004",
        "name":        "Investment Optimization Report",
        "description": "Top control recommendations with ROSI and EAL reduction estimates.",
        "type":        "OPTIMIZATION",
        "format":      "JSON",
        "generated":   "2026-08-31",
        "size_kb":     24,
        "frameworks":  ["NIST_CSF", "CIS_CONTROLS"],
    },
    {
        "id":          "rep-005",
        "name":        "Board Risk Report — Q3 2026",
        "description": "Executive summary of cyber risk posture for board presentation.",
        "type":        "BOARD_SUMMARY",
        "format":      "JSON",
        "generated":   "2026-08-01",
        "size_kb":     56,
        "frameworks":  ["ISO_27001", "NIST_CSF", "RBI_CSF"],
    },
]


def _generate_report_data(report_id: str) -> dict:
    """Generate live report data by calling internal modules."""
    if report_id == "rep-001":
        from backend.scenario_engine.simulator import simulate_enterprise, PRESET_SCENARIOS
        import json
        from pathlib import Path
        assets = json.load(open(Path(__file__).resolve().parents[3] / "data/demo/assets.json"))
        mfa = simulate_enterprise(assets, {"implement_mfa": True})
        return {
            "enterprise_risk_score": 78,
            "total_eal_lakh":        mfa["before_total_eal_lakh"],
            "top_risks":             ["A003 — Auth API", "A002 — Payment DB", "A001 — Payment GW"],
            "mfa_reduction_lakh":    mfa["reduction_lakh"],
            "generated_at":          datetime.utcnow().isoformat(),
        }
    elif report_id == "rep-002":
        from backend.compliance.mapper import get_compliance_summary, get_gaps
        return {
            "frameworks":    get_compliance_summary(),
            "gaps":          get_gaps(),
            "generated_at":  datetime.utcnow().isoformat(),
        }
    elif report_id == "rep-003":
        return {
            "note":         "Connect to live findings DB for digest",
            "generated_at": datetime.utcnow().isoformat(),
        }
    elif report_id == "rep-004":
        from backend.optimizer.knapsack import optimize_budget
        result = optimize_budget(10_000_000)
        return {
            "budget_lakh":       result["budget_lakh"],
            "reduction_lakh":    result["risk_reduced_lakh"],
            "rosi":              result["rosi"],
            "controls":          result["selected_controls"],
            "generated_at":      datetime.utcnow().isoformat(),
        }
    elif report_id == "rep-005":
        return {
            "enterprise_risk_score": 78,
            "var_95_lakh":           247.7,
            "top_concern":           "Authentication API — multi-source confirmed exploit",
            "recommendation":        "Implement MFA and patch CVE-2024-21887 immediately",
            "generated_at":          datetime.utcnow().isoformat(),
        }
    return {"generated_at": datetime.utcnow().isoformat()}


@router.get("")
def list_reports():
    return {
        "reports": REPORTS,
        "count":   len(REPORTS),
    }


@router.get("/{report_id}")
def get_report(report_id: str):
    report = next((r for r in REPORTS if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")
    data = _generate_report_data(report_id)
    return {**report, "data": data}
