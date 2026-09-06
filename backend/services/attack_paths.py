"""Evidence-derived attack reachability; no inferred or fabricated edges."""

from collections import defaultdict, deque

from backend.database.connection import get_connection


def calculate_attack_paths(organization_id, max_depth: int = 8) -> dict:
    with get_connection() as db:
        rows = db.execute(
            """SELECT external_edge_id,source_name,source_node,target_node,relation_type,
                      source_kind,target_kind,target_asset_id,confidence,observed_at,valid_until,evidence
               FROM relationship_edges WHERE organization_id=%s AND observed_at<=NOW()
                 AND (valid_until IS NULL OR valid_until>NOW()) ORDER BY source_node,target_node""",
            (organization_id,),
        ).fetchall()
    graph = defaultdict(list)
    entries = set()
    targets = set()
    for row in rows:
        graph[row["source_node"]].append(row)
        if row["source_kind"].upper() in {"INTERNET", "EXTERNAL", "UNTRUSTED"}:
            entries.add(row["source_node"])
        evidence = row["evidence"] or {}
        if row["target_kind"].upper() in {"CROWN_JEWEL", "CRITICAL_ASSET"} or evidence.get("critical_target") is True:
            targets.add(row["target_node"])
    paths = []
    for entry in sorted(entries):
        queue = deque([(entry, [], {entry})])
        while queue:
            node, edges, visited = queue.popleft()
            if node in targets and edges:
                confidence = min(float(edge["confidence"]) for edge in edges)
                paths.append({
                    "id": "path-" + "-".join(edge["external_edge_id"] for edge in edges),
                    "start": entry, "target": node, "risk_score": round(confidence * 100),
                    "confidence": confidence,
                    "nodes": [entry] + [edge["target_node"] for edge in edges],
                    "edges": edges,
                    "financial_impact_inr": max(float((edge["evidence"] or {}).get("financial_impact_inr", 0)) for edge in edges),
                    "calculation": "risk_score = minimum edge confidence * 100",
                })
                continue
            if len(edges) >= max_depth:
                continue
            for edge in graph[node]:
                target = edge["target_node"]
                if target not in visited:
                    queue.append((target, edges + [edge], visited | {target}))
    paths.sort(key=lambda row: (-row["risk_score"], row["id"]))
    return {"paths": paths, "count": len(paths), "edge_count": len(rows),
            "provenance": "current organization-supplied relationship evidence",
            "limitations": ["Reachability is evidence-based and does not prove exploitability",
                            "Missing edges produce incomplete paths rather than synthetic links"]}
