from uuid import UUID
from contextlib import contextmanager

import pytest

from backend.services import attack_paths


def test_demo_attack_paths_fall_back_when_neo4j_is_unavailable(monkeypatch):
    monkeypatch.setattr(
        attack_paths,
        "project_and_traverse",
        lambda *args, **kwargs: (_ for _ in ()).throw(ConnectionError("Neo4j unavailable")),
    )

    result = attack_paths.calculate_attack_paths(
        UUID("00000000-0000-0000-0000-000000000002"), demo=True
    )

    assert result["count"] >= 13
    assert result["edge_count"] == len(attack_paths.DEMO_EDGES)
    assert result["graph_engine"] == "Deterministic SIH demo traversal"
    assert all(path["nodes"] and path["edges"] for path in result["paths"])
    targets = {path["nodes"][-1]["label"] for path in result["paths"]}
    assert {
        "Payment Database", "Customer Data Lake", "Secrets Vault", "Finance Records",
        "Settlement Ledger", "Account Profile Store", "Payment Approval Queue",
        "Analytics Warehouse", "Customer Contact Vault",
    } <= targets
    assert len({node["label"] for path in result["paths"] for node in path["nodes"]}) >= 35


def test_live_attack_paths_do_not_substitute_demo_graph(monkeypatch):
    monkeypatch.setattr(
        attack_paths,
        "project_and_traverse",
        lambda *args, **kwargs: (_ for _ in ()).throw(ConnectionError("Neo4j unavailable")),
    )
    class FakeDatabase:
        def execute(self, *args, **kwargs):
            return self

        def fetchall(self):
            return []

    @contextmanager
    def fake_connection():
        yield FakeDatabase()

    monkeypatch.setattr(attack_paths, "get_connection", fake_connection)

    with pytest.raises(ConnectionError):
        attack_paths.calculate_attack_paths(
            UUID("00000000-0000-0000-0000-000000000001"), demo=False
        )
