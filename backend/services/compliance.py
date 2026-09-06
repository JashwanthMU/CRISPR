"""Organization-scoped compliance calculations from current supplied evidence."""

from backend.database.connection import get_connection


def compliance_result(organization_id) -> dict:
    with get_connection() as db:
        rows = db.execute(
            """SELECT r.requirement_id,r.framework,r.requirement_ref,r.title,r.description,r.weight,
                      e.status,e.source_name,e.evidence_reference,e.asset_id,e.financial_impact_inr,
                      e.confidence,e.observed_at,e.valid_until
               FROM compliance_requirements r
               LEFT JOIN LATERAL (
                 SELECT * FROM compliance_evidence ce
                 WHERE ce.organization_id=r.organization_id AND ce.requirement_id=r.requirement_id
                   AND ce.observed_at<=NOW() AND ce.valid_until>NOW()
                 ORDER BY ce.observed_at DESC,ce.created_at DESC LIMIT 1
               ) e ON TRUE
               WHERE r.organization_id=%s AND r.active=TRUE
               ORDER BY r.framework,r.requirement_ref""", (organization_id,),
        ).fetchall()
    frameworks = {}
    gaps = []
    for row in rows:
        status = row["status"] or "UNKNOWN"
        item = {**row, "status": status, "weight": float(row["weight"]),
                "financial_impact_inr": float(row["financial_impact_inr"] or 0)}
        item["impact_inr"] = item["financial_impact_inr"]
        bucket = frameworks.setdefault(row["framework"], {"weight": 0.0, "compliant": 0.0,
                                                            "assessed": 0.0, "requirements": []})
        bucket["weight"] += item["weight"]
        bucket["compliant"] += item["weight"] if status == "COMPLIANT" else 0
        bucket["assessed"] += item["weight"] if status != "UNKNOWN" else 0
        bucket["requirements"].append(item)
        if status != "COMPLIANT":
            gaps.append(item)
    summaries = []
    for framework, bucket in frameworks.items():
        total = bucket["weight"]
        score = round(bucket["compliant"] / total * 100, 1) if total else 0
        coverage = round(bucket["assessed"] / total * 100, 1) if total else 0
        summaries.append({"framework": framework, "score": score, "evidence_coverage_pct": coverage,
                          "status": "COMPLIANT" if score == 100 and coverage == 100 else "NEEDS_REVIEW",
                          "requirement_count": len(bucket["requirements"])})
    return {"frameworks": summaries, "gaps": gaps, "requirement_count": len(rows)}
