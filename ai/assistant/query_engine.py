"""CRISPR AI Risk Advisor — query engine.

Pipeline: NL question -> deterministic keyword intent routing (LLM cascade
for unrecognized phrasing) -> fetch real figures from backend APIs ->
build answer. Template answers are always available; the LLM only polishes
phrasing, and its output passes through the number guardrail before being
returned. The engine NEVER invents financial figures.
"""

import json

from ai.tools import optimize_tools, risk_tools, scenario_tools
from ai.tools.formatting import extract_budget_inr, format_inr, format_pct
from ai.tools.guardrail import validate as guardrail_validate
from ai.tools.llm import chat, is_available
from ml.anomaly_detection.detector import detect_anomalies
from ml.forecasting.trend import DEFAULT_DAILY_GROWTH_RATE, forecast_eal
from backend.data_access import require_demo_mode
from backend.data_access import load_assets, load_findings

INTENT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("full_analysis", ("complete executive dashboard", "complete technical dashboard",
                       "full dashboard analysis", "entire dashboard analysis")),
    ("mfa_scenario", ("mfa", "multi-factor", "multifactor")),
    ("patch_delay_scenario", ("delay patch", "patch delay", "patching by 30", "delay by 30",
                              "delayed patch", "30 days", "30 day", "wait 30", "patch later")),
    ("budget_optimize", ("budget", "spend", "invest", "crore", "lakh", "allocate")),
    ("risk_drivers", ("why ", "reason", "driver", "cause", "explain the risk")),
    ("top_risk", ("highest financial", "top risk", "worst risk", "biggest risk",
                  "highest risk", "top cyber", "most dangerous")),
    ("forecast", ("forecast", "trend", "90 day", "90-day", "next 90", "future risk",
                  "risk trajectory", "no action")),
    ("anomaly_scan", ("anomal", "failed login", "suspicious login", "unusual login",
                      "brute force", "login spike")),
    ("enterprise_summary", ("overall", "enterprise", "total exposure", "total eal",
                            "how bad", "whole company", "entire organization")),
]

TASK_BY_INTENT = {
    "full_analysis": "explain",
    "top_risk": "explain",
    "risk_drivers": "explain",
    "enterprise_summary": "explain",
    "forecast": "explain",
    "anomaly_scan": "explain",
    "mfa_scenario": "mitigate",
    "patch_delay_scenario": "mitigate",
    "budget_optimize": "mitigate",
}

SYSTEM_PROMPT = (
    "You are CRISPR, the AI Risk Advisor for the current organization. "
    "You explain cyber risk results to executives. STRICT RULES: "
    "Use ONLY the rupee figures and percentages provided in ENGINE DATA. "
    "Never invent, round differently, extrapolate, or estimate any number. "
    "If a figure is not in the data, omit it. Keep answers under 120 words."
)

GENERAL_SYSTEM_PROMPT = (
    "You are CRISPR, a concise cybersecurity advisor. Answer the user's general "
    "cybersecurity question accurately in plain language, including what it is, why "
    "it matters, and the main mitigation. Do not claim knowledge of the organization’s current "
    "systems or risk figures. Never invent financial figures. Keep the answer under 140 words."
)


def route_intent(question: str) -> str:
    q = f" {question.lower().strip()} "
    for intent, keywords in INTENT_KEYWORDS:
        if any(keyword in q for keyword in keywords):
            return intent
    return "general_question"


def _answer_general(question: str) -> tuple[str, dict, str]:
    normalized = question.lower().strip()
    if normalized in {"hi", "hii", "hello", "hey", "good morning", "good afternoon", "good evening"}:
        return (
            "Hello! Ask me about the organization’s live risk posture, scenarios, investments, "
            "or any general cybersecurity concept.",
            {},
            "template",
        )
    if normalized in {"bye", "goodbye", "see you", "thanks", "thank you"}:
        return "Goodbye. Happy to help whenever you need me.", {}, "template"

    fallback = (
        "I can explain general cybersecurity concepts, but the language model is currently "
        "unavailable. You can still ask about top risks, risk drivers, MFA, patch delays, "
        "budgets, forecasts, or login anomalies."
    )
    if "idor" in normalized or "insecure direct object reference" in normalized:
        fallback = (
            "IDOR (Insecure Direct Object Reference) is an access-control vulnerability. "
            "It occurs when an application accepts an object identifier—such as an account, "
            "invoice, or user ID—but does not verify that the signed-in user is authorized to "
            "access that object. An attacker may change the identifier to read or modify another "
            "user's data. Prevent it with server-side authorization checks on every object request, "
            "deny-by-default policies, indirect identifiers where useful, and access-control tests."
        )

    llm_answer = chat(
        task="general",
        system=GENERAL_SYSTEM_PROMPT,
        user=question,
        max_tokens=350,
        temperature=0.2,
        request_timeout_s=25.0,
        max_attempts=2,
    )
    if not llm_answer:
        return fallback, {}, "template"
    guarded = guardrail_validate(llm_answer, {})
    if not guarded["ok"]:
        return fallback, {}, "template"
    return guarded["text"], {}, "llm"


def _answer_top_risk(question: str = "", organization_id=None) -> tuple[str, dict]:
    enterprise = risk_tools.get_enterprise_summary(organization_id)
    top = enterprise.get("top_risk") or {}
    drivers = top.get("risk_drivers") or []
    driver_names = ", ".join((d.get("factor") or d.get("driver") or d.get("name", "")) for d in drivers[:3] if isinstance(d, dict)) \
        if drivers else "exposure, threat activity and control weakness"
    answer = (
        f"Our highest financial cyber risk is {top.get('asset_name', 'unknown')} "
        f"({top.get('business_service', '')}) with an Expected Annual Loss of "
        f"{format_inr(top.get('eal_inr', 0))} at {format_pct(top.get('likelihood', 0) * 100 if top.get('likelihood', 0) <= 1 else top.get('likelihood', 0))} likelihood. "
        f"Top drivers: {driver_names}. Enterprise exposure stands at "
        f"{format_inr(enterprise.get('total_eal_inr', 0))}."
    )
    return answer, {"enterprise_risk_score": enterprise.get("enterprise_risk_score"),
                    "total_eal_inr": enterprise.get("total_eal_inr"),
                    "var_95_inr": enterprise.get("var_95_inr"),
                    "top_risk": top}


def _answer_risk_drivers(question: str, organization_id=None) -> tuple[str, dict]:
    row = risk_tools.find_risk_by_question(question, organization_id) or risk_tools.get_top_risk(organization_id)
    if not row:
        return "No risk case is currently modeled.", {}
    ce = row.get("control_effectiveness_pct")
    likelihood = row.get("likelihood", 0)
    likelihood_pct = likelihood * 100 if likelihood <= 1 else likelihood
    drivers = row.get("risk_drivers") or []
    driver_lines = "; ".join(
        (d.get("factor") or d.get("driver") or d.get("name", "driver")) if isinstance(d, dict) else str(d)
        for d in drivers[:5]
    ) or "control weakness and exposure"
    answer = (
        f"{row.get('asset_name')} carries an EAL of {format_inr(row.get('eal_inr', 0))} "
        f"with {format_pct(likelihood_pct)} annual incident probability and control effectiveness of "
        f"{format_pct(ce)} . Main risk drivers: {driver_lines}."
    )
    return answer, {"risk_case": row}


def _scenario_answer(sim: dict, action_label: str) -> tuple[str, dict]:
    before, after = sim["before_total_eal_inr"], sim["after_total_eal_inr"]
    delta, pct = sim["reduction_inr"], sim["reduction_pct"]
    direction = "reduces" if delta >= 0 else "increases"
    magnitude = abs(delta)
    answer = (
        f"{action_label} {direction} enterprise EAL from {format_inr(before)} to "
        f"{format_inr(after)} ({'a reduction' if delta >= 0 else 'an increase'} of "
        f"{format_inr(magnitude)}, {format_pct(abs(pct))})."
    )
    return answer, {"scenario": sim}


def _answer_mfa(question: str, organization_id=None) -> tuple[str, dict]:
    sim = scenario_tools.simulate_mfa(organization_id)
    answer, data = _scenario_answer(sim, "Implementing MFA across privileged accounts")
    cost = next((p["cost_inr"] for p in _preset_costs() if p["id"] == "mfa"), None)
    if cost:
        data["implementation_cost_inr"] = cost
        answer += f" Estimated implementation cost: {format_inr(cost)}."
    return answer, data


def _answer_patch_delay(question: str, organization_id=None) -> tuple[str, dict]:
    days = 30
    sim = scenario_tools.simulate_patch_delay(days, organization_id)
    answer, data = _scenario_answer(sim, f"Delaying remediation by {days} days")
    return answer, data


def _answer_budget(question: str, organization_id=None) -> tuple[str, dict]:
    budget = extract_budget_inr(question)
    plan = optimize_tools.optimize_investment(budget, organization_id)
    controls = plan.get("selected_controls", [])
    names = ", ".join(c["name"] for c in controls) or "none fit this budget"
    enterprise_total = risk_tools.get_enterprise_summary(organization_id).get("total_eal_inr", 0)
    residual = max(enterprise_total - plan.get("total_reduction_inr", 0), 0)
    answer = (
        f"With a {format_inr(budget)} budget, invest in: {names}. Total spend "
        f"{format_inr(plan['spent_inr'])}, unused {format_inr(plan['remaining_inr'])}. "
        f"This cuts risk by {format_inr(plan['total_reduction_inr'])}, taking enterprise EAL "
        f"from {format_inr(enterprise_total)} to about {format_inr(residual)} "
        f"(ROSI {plan.get('rosi', 0)}x)."
    )
    return answer, {
        "current_enterprise_eal_inr": enterprise_total,
        "residual_eal_inr_estimate": round(residual),
        "optimization": plan,
    }


def _answer_forecast(question: str, organization_id=None) -> tuple[str, dict]:
    require_demo_mode("Assumption-based risk projection", organization_id)
    base = risk_tools.get_enterprise_summary(organization_id).get("total_eal_inr", 0)
    forecast = forecast_eal(base, horizon_days=90, step_days=15,
                            daily_growth_rate=DEFAULT_DAILY_GROWTH_RATE)
    s = forecast["summary"]
    answer = (
        f"If we take no action, enterprise EAL grows from {format_inr(s['start_eal_inr'])} today "
        f"to {format_inr(s['end_eal_inr'])} within 90 days — an increase of "
        f"{format_inr(s['increase_inr'])} ({format_pct(s['increase_pct'])}) at the current drift rate."
    )
    return answer, {"forecast": forecast}


def _answer_anomalies(question: str, organization_id=None) -> tuple[str, dict]:
    require_demo_mode("Fixture-based anomaly detection", organization_id)
    detection = detect_anomalies(include_llm_summary=False)
    flagged = detection["anomalies"]
    if flagged:
        parts = ", ".join(
            f"{a['asset_id']} ({format_pct(a['recent_failure_rate'] * 100)} recent failure rate, anomaly score {a['anomaly_score']:.4f})"
            for a in flagged
        )
        answer = (
            f"Login anomaly scan flagged {len(flagged)} asset(s): {parts}, against a fleet "
            f"baseline failure rate of {format_pct(detection['baseline_failure_rate'] * 100)}."
        )
    else:
        answer = "No login anomalies detected above threshold."
    return answer, {"detection": detection}


def _answer_enterprise(question: str = "", organization_id=None) -> tuple[str, dict]:
    e = risk_tools.get_enterprise_summary(organization_id)
    answer = (
        f"Enterprise risk score is {e.get('enterprise_risk_score')} with total expected annual loss of "
        f"{format_inr(e.get('total_eal_inr', 0))} and a 95th-percentile loss of "
        f"{format_inr(e.get('var_95_inr', 0))}. Highest exposure: "
        f"{(e.get('top_risk') or {}).get('asset_name', 'n/a')}."
    )
    return answer, {"summary": e}


def _answer_full_analysis(question: str, organization_id=None) -> tuple[str, dict]:
    """Explain the current role-specific dashboard from calculated organization data."""
    enterprise = risk_tools.get_enterprise_summary(organization_id)
    risks = risk_tools.get_all_risks(organization_id).get("risks", [])
    assets = load_assets(organization_id)
    findings = load_findings(organization_id=organization_id)
    top_risks = risks[:3]
    is_technical = "technical" in question.lower() or "security team" in question.lower()
    data = {
        "enterprise": enterprise,
        "top_risks": top_risks,
        "asset_count": len(assets),
        "internet_exposed_assets": sum(bool(asset.get("internet_facing")) for asset in assets),
        "finding_counts": {
            severity: sum(str(row.get("severity", "")).upper() == severity for row in findings)
            for severity in ("CRITICAL", "HIGH", "MEDIUM", "LOW")
        },
    }
    top_names = ", ".join(
        f"{row.get('asset_name', row.get('asset_id', 'unknown'))} ({format_inr(row.get('eal_inr', 0))} EAL)"
        for row in top_risks
    ) or "no modeled risk cases"
    if is_technical:
        counts = data["finding_counts"]
        answer = (
            f"Technical posture: risk score {enterprise.get('enterprise_risk_score')} with "
            f"{counts['CRITICAL']} critical and {counts['HIGH']} high findings across {len(assets)} assets; "
            f"{data['internet_exposed_assets']} are internet exposed. Priority risk cases: {top_names}. "
            "Act first on exploited or internet-facing critical findings, validate access and control weaknesses, "
            "assign accountable owners, and verify each remediation with a rescan before recognizing risk reduction."
        )
    else:
        answer = (
            f"Executive posture: enterprise risk score {enterprise.get('enterprise_risk_score')}, Expected Annual Loss "
            f"{format_inr(enterprise.get('total_eal_inr', 0))}, and P95 Cyber VaR "
            f"{format_inr(enterprise.get('var_95_inr', 0))}. Largest business exposures: {top_names}. "
            "Leadership should fund the controls with the strongest verified risk reduction, address regulatory gaps, "
            "and require evidence-backed remediation verification before reporting realized savings."
        )
    return answer, data


def _preset_costs() -> list[dict]:
    try:
        from backend.app.api.scenarios import PRESET_SCENARIOS
        return PRESET_SCENARIOS
    except Exception:
        return []


def _help_answer() -> tuple[str, dict]:
    answer = (
        "I can answer from live engine data. Try:\n"
        "- What is our highest financial cyber risk?\n"
        "- Why is the Auth API high risk?\n"
        "- What happens if we implement MFA?\n"
        "- What if we delay patching by 30 days?\n"
        "- What should we do with ₹1 crore?\n"
        "- Show me the 90-day risk forecast\n"
        "- Any suspicious failed logins?"
    )
    return answer, {}


HANDLERS = {
    "top_risk": _answer_top_risk,
    "enterprise_summary": _answer_enterprise,
    "forecast": _answer_forecast,
    "anomaly_scan": _answer_anomalies,
}


def _polish_with_llm(intent: str, question: str, data: dict) -> tuple[str | None, list]:
    """Ask the LLM to phrase the answer using ONLY fetched data; guardrail-check the result."""
    if not is_available():
        return None, []
    task = TASK_BY_INTENT.get(intent, "explain")
    try:
        facts = json.dumps(data, default=str)
    except (TypeError, ValueError):
        return None, []
    raw = chat(
        task=task,
        system=SYSTEM_PROMPT,
        user=f"Question: {question}\n\nENGINE DATA (the ONLY figures you may cite):\n{facts}",
    )
    if not raw:
        return None, []
    guarded = guardrail_validate(raw, data)
    if not guarded["ok"]:
        return None, guarded["violations"]
    return guarded["text"], guarded["violations"]


HANDLERS_PARAM = {
    "full_analysis": _answer_full_analysis,
    "risk_drivers": _answer_risk_drivers,
    "mfa_scenario": _answer_mfa,
    "patch_delay_scenario": _answer_patch_delay,
    "budget_optimize": _answer_budget,
}

FULL_HANDLERS = {**HANDLERS, **HANDLERS_PARAM}


def answer_question(question: str, organization_id) -> dict:
    intent = route_intent(question)
    if intent == "general_question":
        answer, data, engine = _answer_general(question)
        return {"answer": answer, "data": data, "intent": intent, "engine": engine}

    handler = FULL_HANDLERS.get(intent)

    if handler is None:
        template, data = _help_answer()
        engine = "template"
    else:
        template, data = handler(question, organization_id)
        engine = "template"
        llm_answer, violations = _polish_with_llm(intent, question, data)
        if llm_answer:
            template, engine = llm_answer, "llm"

    return {"answer": template, "data": data, "intent": intent, "engine": engine}


def handle_query(question: str, organization_id) -> dict:
    return answer_question(question, organization_id)
