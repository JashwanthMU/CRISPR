"""Deployment smoke tests for imports exercised by the ASGI entry point."""


def test_asgi_application_imports():
    from backend.app.main import app

    assert app.title == "CRISPR"


def test_ai_scenario_tool_uses_canonical_engine():
    from ai.tools import scenario_tools

    assert callable(scenario_tools.get_current_state)
