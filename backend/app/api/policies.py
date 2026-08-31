"""
Policies API — feat/platform-connections
GET   /api/policies              → list all policies
PATCH /api/policies/{id}/toggle  → enable/disable a policy
POST  /api/policies              → create a new policy
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

INITIAL_POLICIES = [
    {
        "id": "pol-001",
        "name": "Require MFA for all privileged accounts",
        "description": "Blocks provisioning of admin-tier IAM roles without MFA enforced.",
        "framework": "RBI_CSF",
        "framework_ref": "IAM-3",
        "enabled": True,
        "severity": "CRITICAL",
        "affected_assets": ["A001", "A002", "A003"],
        "violations": 12,
        "last_evaluated": "2026-08-31",
        "auto_remediate": False,
    },
    {
        "id": "pol-002",
        "name": "Disallow public S3 buckets in production",
        "description": "Flags and auto-remediates publicly readable storage buckets.",
        "framework": "ISO_27001",
        "framework_ref": "A.13.1",
        "enabled": True,
        "severity": "CRITICAL",
        "affected_assets": ["A001", "A004"],
        "violations": 2,
        "last_evaluated": "2026-08-31",
        "auto_remediate": True,
    },
    {
        "id": "pol-003",
        "name": "Require signed commits on protected branches",
        "description": "Enforces commit signature verification on main/master branches.",
        "framework": "CIS_CONTROLS",
        "framework_ref": "CIS-16",
        "enabled": False,
        "severity": "MEDIUM",
        "affected_assets": [],
        "violations": 0,
        "last_evaluated": "2026-08-31",
        "auto_remediate": False,
    },
    {
        "id": "pol-004",
        "name": "Block deploys with unresolved critical CVEs",
        "description": "CI/CD pipelines fail if a critical reachable CVE is unresolved.",
        "framework": "NIST_CSF",
        "framework_ref": "PR.IP-12",
        "enabled": True,
        "severity": "HIGH",
        "affected_assets": ["A002", "A003"],
        "violations": 3,
        "last_evaluated": "2026-08-31",
        "auto_remediate": False,
    },
    {
        "id": "pol-005",
        "name": "Rotate service account secrets every 90 days",
        "description": "Flags secrets older than 90 days for mandatory rotation.",
        "framework": "SEBI_CSCRF",
        "framework_ref": "CM-3",
        "enabled": False,
        "severity": "HIGH",
        "affected_assets": ["A001", "A003"],
        "violations": 5,
        "last_evaluated": "2026-08-31",
        "auto_remediate": False,
    },
    {
        "id": "pol-006",
        "name": "Enforce EDR on all production endpoints",
        "description": "All production assets must have EDR agent installed and active.",
        "framework": "CIS_CONTROLS",
        "framework_ref": "CIS-10",
        "enabled": True,
        "severity": "HIGH",
        "affected_assets": ["A005", "A006"],
        "violations": 2,
        "last_evaluated": "2026-08-31",
        "auto_remediate": False,
    },
    {
        "id": "pol-007",
        "name": "Encrypt all data at rest",
        "description": "All storage volumes and databases must use AES-256 encryption.",
        "framework": "ISO_27001",
        "framework_ref": "A.10.1",
        "enabled": True,
        "severity": "CRITICAL",
        "affected_assets": ["A002"],
        "violations": 0,
        "last_evaluated": "2026-08-31",
        "auto_remediate": False,
    },
]

# In-memory state
_state: dict[str, dict] = {p["id"]: dict(p) for p in INITIAL_POLICIES}


class PolicyCreate(BaseModel):
    name: str
    description: str
    framework: str
    framework_ref: Optional[str] = None
    severity: str = "MEDIUM"
    auto_remediate: bool = False


@router.get("")
def list_policies():
    policies = list(_state.values())
    enabled  = [p for p in policies if p["enabled"]]
    violations = sum(p["violations"] for p in policies if p["enabled"])
    return {
        "policies":          policies,
        "count":             len(policies),
        "enabled_count":     len(enabled),
        "disabled_count":    len(policies) - len(enabled),
        "total_violations":  violations,
    }


@router.get("/{policy_id}")
def get_policy(policy_id: str):
    policy = _state.get(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found")
    return policy


@router.patch("/{policy_id}/toggle")
def toggle_policy(policy_id: str):
    policy = _state.get(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found")
    _state[policy_id]["enabled"] = not _state[policy_id]["enabled"]
    return {
        "id":      policy_id,
        "enabled": _state[policy_id]["enabled"],
        "message": f"Policy {'enabled' if _state[policy_id]['enabled'] else 'disabled'} successfully",
    }


@router.post("", status_code=201)
def create_policy(body: PolicyCreate):
    import uuid, datetime
    new_id = f"pol-{str(uuid.uuid4())[:8]}"
    new_policy = {
        "id":             new_id,
        "name":           body.name,
        "description":    body.description,
        "framework":      body.framework,
        "framework_ref":  body.framework_ref,
        "enabled":        True,
        "severity":       body.severity,
        "affected_assets": [],
        "violations":     0,
        "last_evaluated": str(datetime.date.today()),
        "auto_remediate": body.auto_remediate,
    }
    _state[new_id] = new_policy
    return new_policy
