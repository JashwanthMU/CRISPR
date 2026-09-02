"""Scenario tools — the AI's access to the what-if scenario simulator.

Calls the scenario ENGINE directly (backend/scenario_engine/simulator.py).
The HTTP route function in api/scenarios.py uses FastAPI Query() defaults,
which poison direct calls; going to the engine keeps results identical to
GET /api/scenarios while staying safe for in-process use.
"""

from backend.data_access import load_assets
from backend.scenario_engine.simulator import simulate_enterprise


def _assets() -> list:
    return load_assets()


def _run(overrides: dict) -> dict:
    return simulate_enterprise(_assets(), overrides)


def get_current_state() -> dict:
    return _run({})


def simulate_mfa() -> dict:
    return _run({"implement_mfa": True})


def simulate_patch_delay(days: int = 30) -> dict:
    return _run({"patch_delay": int(days)})


def simulate_patching_now() -> dict:
    return _run({"implement_patching": True})


def simulate_segmentation() -> dict:
    return _run({"implement_segmentation": True})
