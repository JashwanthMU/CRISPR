"""Shared formatting helpers for advisor tools."""


def format_inr(value: float) -> str:
    value = float(value)
    if abs(value) >= 1_00_00_000:
        return f"₹{value / 1_00_00_000:.2f} crore"
    if abs(value) >= 1_00_000:
        return f"₹{value / 1_00_000:.1f} lakh"
    return f"₹{value:,.0f}"


def format_pct(value: float) -> str:
    return f"{value:.1f}%"


def extract_budget_inr(question: str) -> float:
    import re

    text = question.lower().replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)\s*(crore|cr)\b", text)
    if match:
        return float(match.group(1)) * 1_00_00_000
    match = re.search(r"(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(lakh|l)\b", text)
    if match:
        return float(match.group(1)) * 1_00_000
    match = re.search(r"(?:₹|rs\.?\s*)(\d{5,})", text)
    if match:
        return float(match.group(1))
    return 10_000_000
