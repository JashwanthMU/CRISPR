"""Evidence-derived attack reachability traversed in Neo4j."""

import json

from backend.database.connection import get_connection
from backend.services.neo4j_graph import project_and_traverse


DEMO_EDGES = [
    {"external_edge_id": "demo-1", "source_name": "SIH demo", "source_node": "Internet", "target_node": "Public API Gateway", "relation_type": "internet exposed", "source_kind": "INTERNET", "target_kind": "API", "confidence": .98, "evidence": {}},
    {"external_edge_id": "demo-2", "source_name": "SIH demo", "source_node": "Public API Gateway", "target_node": "Authentication Service", "relation_type": "routes traffic", "source_kind": "API", "target_kind": "COMPUTE", "confidence": .94, "evidence": {}},
    {"external_edge_id": "demo-3", "source_name": "SIH demo", "source_node": "Authentication Service", "target_node": "CVE-2025 Auth Bypass", "relation_type": "exploitable finding", "source_kind": "COMPUTE", "target_kind": "VULNERABILITY", "confidence": .91, "evidence": {}},
    {"external_edge_id": "demo-4", "source_name": "SIH demo", "source_node": "CVE-2025 Auth Bypass", "target_node": "Privileged IAM Role", "relation_type": "assumes role", "source_kind": "VULNERABILITY", "target_kind": "IDENTITY", "confidence": .89, "evidence": {}},
    {"external_edge_id": "demo-5", "source_name": "SIH demo", "source_node": "Privileged IAM Role", "target_node": "Payment Service", "relation_type": "admin access", "source_kind": "IDENTITY", "target_kind": "COMPUTE", "confidence": .87, "evidence": {}},
    {"external_edge_id": "demo-6", "source_name": "SIH demo", "source_node": "Payment Service", "target_node": "Payment Database", "relation_type": "reads and writes", "source_kind": "COMPUTE", "target_kind": "CRITICAL_ASSET", "confidence": .86, "evidence": {"financial_impact_inr": 78500000}},
    {"external_edge_id": "demo-7", "source_name": "SIH demo", "source_node": "Public API Gateway", "target_node": "Legacy Admin Portal", "relation_type": "legacy route", "source_kind": "API", "target_kind": "API", "confidence": .83, "evidence": {}},
    {"external_edge_id": "demo-8", "source_name": "SIH demo", "source_node": "Legacy Admin Portal", "target_node": "Customer Data Lake", "relation_type": "export permission", "source_kind": "API", "target_kind": "CROWN_JEWEL", "confidence": .79, "evidence": {"financial_impact_inr": 124000000}},
    {"external_edge_id": "demo-9", "source_name": "SIH demo", "source_node": "Internet", "target_node": "Corporate VPN", "relation_type": "remote access", "source_kind": "INTERNET", "target_kind": "API", "confidence": .93, "evidence": {}},
    {"external_edge_id": "demo-10", "source_name": "SIH demo", "source_node": "Corporate VPN", "target_node": "Bastion Host", "relation_type": "stolen session", "source_kind": "API", "target_kind": "COMPUTE", "confidence": .84, "evidence": {}},
    {"external_edge_id": "demo-11", "source_name": "SIH demo", "source_node": "Bastion Host", "target_node": "Kubernetes Control Plane", "relation_type": "admin network access", "source_kind": "COMPUTE", "target_kind": "COMPUTE", "confidence": .82, "evidence": {}},
    {"external_edge_id": "demo-12", "source_name": "SIH demo", "source_node": "Kubernetes Control Plane", "target_node": "Secrets Vault", "relation_type": "service token access", "source_kind": "COMPUTE", "target_kind": "CROWN_JEWEL", "confidence": .78, "evidence": {"financial_impact_inr": 92000000}},
    {"external_edge_id": "demo-13", "source_name": "SIH demo", "source_node": "Bastion Host", "target_node": "Admin Workstation", "relation_type": "remote desktop", "source_kind": "COMPUTE", "target_kind": "COMPUTE", "confidence": .76, "evidence": {}},
    {"external_edge_id": "demo-14", "source_name": "SIH demo", "source_node": "Admin Workstation", "target_node": "Domain Controller", "relation_type": "credential reuse", "source_kind": "COMPUTE", "target_kind": "CRITICAL_ASSET", "confidence": .72, "evidence": {"financial_impact_inr": 68000000}},
    {"external_edge_id": "demo-15", "source_name": "SIH demo", "source_node": "Internet", "target_node": "Email Gateway", "relation_type": "phishing delivery", "source_kind": "INTERNET", "target_kind": "API", "confidence": .90, "evidence": {}},
    {"external_edge_id": "demo-16", "source_name": "SIH demo", "source_node": "Email Gateway", "target_node": "Finance Endpoint", "relation_type": "malicious attachment", "source_kind": "API", "target_kind": "COMPUTE", "confidence": .81, "evidence": {}},
    {"external_edge_id": "demo-17", "source_name": "SIH demo", "source_node": "Finance Endpoint", "target_node": "ERP Service Account", "relation_type": "token theft", "source_kind": "COMPUTE", "target_kind": "IDENTITY", "confidence": .75, "evidence": {}},
    {"external_edge_id": "demo-18", "source_name": "SIH demo", "source_node": "ERP Service Account", "target_node": "ERP Application", "relation_type": "privileged login", "source_kind": "IDENTITY", "target_kind": "COMPUTE", "confidence": .73, "evidence": {}},
    {"external_edge_id": "demo-19", "source_name": "SIH demo", "source_node": "ERP Application", "target_node": "Finance Records", "relation_type": "database write", "source_kind": "COMPUTE", "target_kind": "CROWN_JEWEL", "confidence": .71, "evidence": {"financial_impact_inr": 101000000}},
    {"external_edge_id": "demo-20", "source_name": "SIH demo", "source_node": "Internet", "target_node": "CI/CD Runner", "relation_type": "public webhook", "source_kind": "INTERNET", "target_kind": "COMPUTE", "confidence": .88, "evidence": {}},
    {"external_edge_id": "demo-21", "source_name": "SIH demo", "source_node": "CI/CD Runner", "target_node": "Cloud Deploy Credentials", "relation_type": "secret exposure", "source_kind": "COMPUTE", "target_kind": "IDENTITY", "confidence": .85, "evidence": {}},
    {"external_edge_id": "demo-22", "source_name": "SIH demo", "source_node": "Cloud Deploy Credentials", "target_node": "Production Kubernetes", "relation_type": "cluster admin", "source_kind": "IDENTITY", "target_kind": "COMPUTE", "confidence": .83, "evidence": {}},
    {"external_edge_id": "demo-23", "source_name": "SIH demo", "source_node": "Production Kubernetes", "target_node": "Container Registry", "relation_type": "image push", "source_kind": "COMPUTE", "target_kind": "CRITICAL_ASSET", "confidence": .80, "evidence": {"financial_impact_inr": 54000000}},
    {"external_edge_id": "demo-24", "source_name": "SIH demo", "source_node": "Production Kubernetes", "target_node": "Customer Object Storage", "relation_type": "workload identity", "source_kind": "COMPUTE", "target_kind": "CROWN_JEWEL", "confidence": .77, "evidence": {"financial_impact_inr": 116000000}},
    {"external_edge_id": "demo-25", "source_name": "SIH demo", "source_node": "Domain Controller", "target_node": "Backup Management", "relation_type": "domain admin access", "source_kind": "CRITICAL_ASSET", "target_kind": "COMPUTE", "confidence": .69, "evidence": {}},
    {"external_edge_id": "demo-26", "source_name": "SIH demo", "source_node": "Backup Management", "target_node": "Immutable Backups", "relation_type": "backup policy control", "source_kind": "COMPUTE", "target_kind": "CROWN_JEWEL", "confidence": .66, "evidence": {"financial_impact_inr": 88000000}},
]


def _node_type(kind: str) -> str:
    mapping = {"INTERNET": "internet", "EXTERNAL": "internet", "UNTRUSTED": "internet", "API": "api", "IDENTITY": "identity", "DATABASE": "database", "CRITICAL_ASSET": "database", "CROWN_JEWEL": "data", "VULNERABILITY": "vulnerability"}
    return mapping.get(kind.upper(), "compute")


def _format_paths(records: list[dict]) -> dict:
    paths = []
    for record in records:
        raw_nodes = record["nodes"]
        confidence = float(record["confidence"])
        severity = "CRITICAL" if confidence >= .8 else "HIGH" if confidence >= .6 else "MEDIUM"
        nodes = [{"id": node["name"], "label": node["name"], "type": _node_type(node.get("kind") or "COMPUTE"), "severity": None if index == 0 else severity, "x": 90 + index * 185, "y": 165 + (index % 2) * 55} for index, node in enumerate(raw_nodes)]
        edges, impact = [], 0.0
        for edge_index, edge in enumerate(record["edges"]):
            evidence = json.loads(edge.get("evidence_json") or "{}")
            impact = max(impact, float(evidence.get("financial_impact_inr") or edge.get("financial_impact_inr") or 0))
            edges.append({"id": edge["edge_id"], "source": raw_nodes[edge_index]["name"], "target": raw_nodes[edge_index + 1]["name"], "label": edge.get("relation_type", "Reachable").replace("_", " "), "risky": True})
        paths.append({"id": "path-" + "-".join(edge["id"] for edge in edges), "title": f'{raw_nodes[0]["name"]} → {raw_nodes[-1]["name"]}', "severity": severity, "risk_score": round(confidence * 100), "confidence": confidence, "nodes": nodes, "edges": edges, "financial_impact_inr": impact})
    return {"paths": paths, "count": len(paths), "graph_engine": "Neo4j", "provenance": "current organization-supplied relationship evidence"}


def _traverse_demo_in_memory(rows: list[dict], max_depth: int) -> list[dict]:
    """Deterministic offline fallback for the explicitly labelled SIH demo.

    Live organizations never use this path. It keeps the golden demo usable
    when the optional Neo4j container is unavailable while retaining the same
    edge evidence and traversal semantics.
    """
    adjacency: dict[str, list[dict]] = {}
    node_kinds: dict[str, str] = {}
    for raw in rows:
        edge = dict(raw)
        adjacency.setdefault(edge["source_node"], []).append(edge)
        node_kinds[edge["source_node"]] = edge.get("source_kind") or "COMPUTE"
        node_kinds[edge["target_node"]] = edge.get("target_kind") or "COMPUTE"

    entries = [name for name, kind in node_kinds.items() if str(kind).upper() in {"INTERNET", "EXTERNAL", "UNTRUSTED"}]
    records: list[dict] = []

    def walk(node: str, path_nodes: list[str], path_edges: list[dict]) -> None:
        if len(path_edges) >= max_depth:
            return
        for raw in adjacency.get(node, []):
            target = raw["target_node"]
            if target in path_nodes:
                continue
            evidence = raw.get("evidence") or {}
            edge = {
                "edge_id": str(raw["external_edge_id"]),
                "relation_type": raw.get("relation_type") or "REACHES",
                "confidence": float(raw.get("confidence") or 0),
                "evidence_json": json.dumps(evidence, default=str),
                "financial_impact_inr": float(evidence.get("financial_impact_inr") or 0),
            }
            next_nodes = [*path_nodes, target]
            next_edges = [*path_edges, edge]
            if str(node_kinds.get(target, "")).upper() in {"CROWN_JEWEL", "CRITICAL_ASSET"}:
                records.append({
                    "nodes": [{"name": name, "kind": node_kinds.get(name, "COMPUTE")} for name in next_nodes],
                    "edges": next_edges,
                    "confidence": min(item["confidence"] for item in next_edges),
                })
            walk(target, next_nodes, next_edges)

    for entry in entries:
        walk(entry, [entry], [])
    records.sort(key=lambda record: record["confidence"], reverse=True)
    return records


def calculate_attack_paths(organization_id, max_depth: int = 8, demo: bool = False) -> dict:
    if demo:
        rows = DEMO_EDGES
    else:
        with get_connection() as db:
            rows = db.execute("""SELECT external_edge_id,source_name,source_node,target_node,relation_type,source_kind,target_kind,confidence,evidence FROM relationship_edges WHERE organization_id=%s AND observed_at<=NOW() AND (valid_until IS NULL OR valid_until>NOW()) ORDER BY source_node,target_node""", (organization_id,)).fetchall()
    graph_engine = "Neo4j"
    try:
        records = project_and_traverse(organization_id, [dict(row) for row in rows], max_depth)
    except Exception:
        if not demo:
            raise
        records = _traverse_demo_in_memory([dict(row) for row in rows], max_depth)
        graph_engine = "Deterministic SIH demo traversal"
    response = _format_paths(records)
    response["graph_engine"] = graph_engine
    response["provenance"] = "bundled SIH demo relationship evidence" if demo else "current organization-supplied relationship evidence"
    response["edge_count"] = len(rows)
    response["limitations"] = ["Reachability is evidence-based and does not prove exploitability", "Missing edges produce incomplete paths rather than synthetic links"]
    return response
