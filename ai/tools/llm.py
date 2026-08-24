"""LLM client for the AI Risk Advisor. Member 4.

Talks to an OpenAI-compatible router (Kiro-backed models). Configuration
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
REQUEST_TIMEOUT_S = 25.0
AVAILABILITY_TTL_S = 60.0

MODEL_REGISTRY = {
    "route": "kr/gpt-5.6-luna",
    "explain": "kr/claude-opus-5",
    "agent": "kr/claude-opus-5-agentic",
    "mitigate": "kr/gpt-5.6-sol-thinking",
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
        response = get_client().get("/models", timeout=5.0)
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
) -> Optional[str]:
    """Generate a completion with the task-appropriate model.

    Returns None on any failure (router down, key missing, timeout) so
    callers can fall back to deterministic templates.
    """
    _, api_key, enabled = _settings()
    if not enabled or not api_key:
        return None
    model = MODEL_REGISTRY.get(task, MODEL_REGISTRY["explain"])
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
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )
        response.raise_for_status()
        body = response.json()
        return body["choices"][0]["message"]["content"]
    except Exception:
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
