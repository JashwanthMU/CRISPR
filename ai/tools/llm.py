"""LLM client for the AI Risk Advisor.

Talks to an OpenAI-compatible model API. Configuration
comes from environment variables loaded from .env:

    LLM_BASE_URL  (default: the team router)
    LLM_API_KEY   (required for LLM features)
    LLM_ENABLED   (set to 'false' to force template-only answers)

The advisor NEVER depends on this module being reachable — every caller
must fall back to deterministic templates when chat() returns None.
"""

import os
import time
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

DEFAULT_BASE_URL = "http://98.94.73.175:20128/v1"
REQUEST_TIMEOUT_S = 90.0
AVAILABILITY_TIMEOUT_S = 25.0
AVAILABILITY_TTL_S = 60.0

MODEL_REGISTRY = {
    "route": "kr/gpt-5.6-sol",
    "general": "kr/gpt-5.6-sol",
    "explain": "kr/claude-opus-5-thinking",
    "agent": "kr/claude-opus-5-thinking-agentic",
    "mitigate": "kr/gpt-5.6-sol-thinking",
}

MODEL_FALLBACKS = {
    "route": ["kr/gpt-5.6-terra", "kr/gpt-5.6-luna"],
    "general": ["kr/claude-opus-5", "kr/gpt-5.6-terra"],
    "explain": ["kr/claude-opus-5", "kr/gpt-5.6-sol-thinking"],
    "agent": ["kr/claude-opus-5-agentic", "kr/gpt-5.6-sol-thinking-agentic"],
    "mitigate": ["kr/claude-opus-5-thinking", "kr/gpt-5.6-sol"],
}

_client: Optional[httpx.Client] = None
_last_availability_check: float = 0.0
_available: bool = False


def _settings() -> tuple[str, str, bool]:
    base_url = os.environ.get("LLM_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    api_key = os.environ.get("LLM_API_KEY", "")
    enabled = os.environ.get("LLM_ENABLED", "true").strip().lower() != "false"
    return base_url, api_key, enabled


def get_client() -> httpx.Client:
    global _client
    if _client is None:
        base_url, api_key, _ = _settings()
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        _client = httpx.Client(base_url=base_url, headers=headers, timeout=REQUEST_TIMEOUT_S)
    return _client


def is_available(force_check: bool = False) -> bool:
    global _last_availability_check, _available
    _, _, enabled = _settings()
    if not enabled:
        return False
    now = time.monotonic()
    if not force_check and (now - _last_availability_check) < AVAILABILITY_TTL_S:
        return _available
    try:
        response = get_client().get("/models", timeout=AVAILABILITY_TIMEOUT_S)
        _available = response.status_code == 200
    except Exception:
        _available = False
    _last_availability_check = now
    return _available


def chat(
    task: str,
    system: str,
    user: str,
    max_tokens: int = 700,
    temperature: float = 0.2,
    request_timeout_s: float = REQUEST_TIMEOUT_S,
    max_attempts: Optional[int] = None,
) -> Optional[str]:
    """Generate a completion with the task-appropriate model.

    Returns None on any failure (router down, key missing, timeout) so
    callers can fall back to deterministic templates.
    """
    _, api_key, enabled = _settings()
    if not enabled or not api_key:
        return None
    primary = MODEL_REGISTRY.get(task, MODEL_REGISTRY["explain"])
    models = [primary, *MODEL_FALLBACKS.get(task, MODEL_FALLBACKS["explain"])]
    if max_attempts is not None:
        models = models[:max_attempts]
    for model in dict.fromkeys(models):
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        try:
            response = get_client().post(
                "/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=request_timeout_s,
            )
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            if isinstance(content, str) and content.strip():
                return content.strip()
        except Exception:
            continue
    return None


def route_with_llm(question: str, candidates: list[str]) -> Optional[str]:
    """Ask the fast model to classify intent when keywords miss."""
    _, _, enabled = _settings()
    if not enabled or not is_available():
        return None
    raw = chat(
        task="route",
        system="Classify the user question into exactly one intent from this list: "
               + ", ".join(candidates)
               + ". Reply with ONLY the intent name, nothing else.",
        user=question,
        max_tokens=10,
        temperature=0.0,
    )
    if raw is None:
        return None
    cleaned = raw.strip().lower().replace(" ", "_")
    return cleaned if cleaned in candidates else None
