"""Tenant-isolated Neo4j projection and attack-path traversal."""

import json
import os
from functools import lru_cache

from neo4j import GraphDatabase


@lru_cache(maxsize=1)
def _driver():
    return GraphDatabase.driver(
        os.getenv("NEO4J_URI", "bolt://neo4j:7687"),
        auth=(os.getenv("NEO4J_USER", "neo4j"), os.environ["NEO4J_PASSWORD"]),
        connection_timeout=5,
    )


def enabled() -> bool:
    return os.getenv("NEO4J_ENABLED", "true").lower() in {"1", "true", "yes"}


def project_and_traverse(organization_id, rows: list[dict], max_depth: int = 8) -> list[dict]:
    """Replace one tenant's derived graph and return evidence-backed paths."""
    if not enabled():
        raise RuntimeError("Neo4j attack-path traversal is disabled")
    organization = str(organization_id)
    edges = []
    for raw in rows:
        row = dict(raw)
        evidence = row.get("evidence") or {}
        edges.append({
            "id": str(row["external_edge_id"]), "source": str(row["source_node"]),
            "target": str(row["target_node"]), "relation": str(row.get("relation_type") or "REACHES"),
            "source_kind": str(row.get("source_kind") or "COMPUTE").upper(),
            "target_kind": str(row.get("target_kind") or "COMPUTE").upper(),
            "confidence": float(row.get("confidence") or 0), "source_name": str(row.get("source_name") or "unknown"),
            "evidence_json": json.dumps(evidence, default=str),
            "financial_impact_inr": float(evidence.get("financial_impact_inr") or 0),
        })
    with _driver().session(database=os.getenv("NEO4J_DATABASE", "neo4j")) as session:
        session.run("MATCH (n:AttackNode {organization_id: $organization}) DETACH DELETE n", organization=organization).consume()
        if edges:
            session.run("""UNWIND $edges AS edge
                MERGE (source:AttackNode {organization_id: $organization, name: edge.source})
                SET source.kind=edge.source_kind, source.entry=edge.source_kind IN ['INTERNET','EXTERNAL','UNTRUSTED']
                MERGE (target:AttackNode {organization_id: $organization, name: edge.target})
                SET target.kind=edge.target_kind, target.critical=edge.target_kind IN ['CROWN_JEWEL','CRITICAL_ASSET']
                MERGE (source)-[relation:REACHES {organization_id: $organization, edge_id: edge.id}]->(target)
                SET relation.relation_type=edge.relation, relation.confidence=edge.confidence,
                    relation.source_name=edge.source_name, relation.evidence_json=edge.evidence_json,
                    relation.financial_impact_inr=edge.financial_impact_inr""", organization=organization, edges=edges).consume()
        depth = max(1, min(int(max_depth), 20))
        result = session.run(f"""MATCH path=(entry:AttackNode {{organization_id: $organization, entry: true}})-[:REACHES*1..{depth}]->(target:AttackNode {{organization_id: $organization, critical: true}})
                WITH path, reduce(score=1.0, rel IN relationships(path) | CASE WHEN rel.confidence < score THEN rel.confidence ELSE score END) AS confidence
                RETURN [node IN nodes(path) | {{name: node.name, kind: node.kind}}] AS nodes,
                       [rel IN relationships(path) | properties(rel)] AS edges, confidence
                ORDER BY confidence DESC""", organization=organization)
        return [record.data() for record in result]
