from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class SourceType(str, Enum):
    BUG_BOUNTY = "BUG_BOUNTY"
    VULNERABILITY_SCANNER = "VULNERABILITY_SCANNER"
    EDR = "EDR"
    XDR = "XDR"
    SIEM = "SIEM"
    IAM = "IAM"
    CSPM = "CSPM"
    THREAT_INTEL = "THREAT_INTEL"

class Finding(BaseModel):
    finding_id: str
    source_type: SourceType
    source_name: str
    asset_id: str
    finding_type: str
    title: str
    cve: Optional[str] = None
    severity: Severity
    confidence: float  # 0.0 – 1.0
    first_seen: str
    status: str = "OPEN"

class Asset(BaseModel):
    asset_id: str
    name: str
    type: str
    business_unit: str
    business_service: str
    criticality: int       # 1–5
    data_sensitivity: int  # 1–5
    revenue_dependency: int
    internet_facing: bool
    is_regulated: bool
    value_inr: float

class RiskCase(BaseModel):
    risk_case_id: str
    title: str
    asset_id: str
    sources: List[str]
    confidence: float
    business_criticality: float
    likelihood: float
    loss_magnitude_inr: float
    eal_inr: float
    risk_score: int
    status: str = "ACTIVE"