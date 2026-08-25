# CRISPR Prototype — Six Member Implementation Plan

## Run the Integrated Platform

Create a repository-root `.env` with `LLM_BASE_URL`, `LLM_API_KEY`, and
`LLM_ENABLED`, then start the complete stack:

```bash
docker compose up --build
```

- Dashboard: `http://localhost:5173`
- Bug bounty portal: `http://localhost:3000`
- FastAPI and OpenAPI docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

The backend seeds PostgreSQL from `data/demo/` during startup and falls back
to the JSON datasets when PostgreSQL is unavailable. Install
`requirements-ml-v2.txt` only when working on future XGBoost/SHAP training.

## Core Workflow

- Member 1: Harish Kumar N
- Member 2: Ishwarya S
- Member 3: Jashwanth MU
- Member 4: Michael S
- Member 5: Kadhiravan EG
- Member 6: Karan RJ

```text
SECURITY SOURCES
Bug Bounty
Vulnerability Scanner
EDR / XDR
SIEM
IAM
CSPM
Threat Intelligence
Asset Inventory / CMDB
        ↓
Member 1 — Ingestion
        ↓
Member 2 — Normalize + Correlate + Asset Mapping
        ↓
Member 3 — Risk + Financial Quantification
        ↓
Member 4 — AI / Risk Intelligence
        ↓
Member 5 — Scenario + Optimization + Compliance
        ↓
Member 6 — Dashboard + Integration
```

---

## Member 1 — Security Integration Engineer

### Responsibility
Collect security data from all sources and provide clean raw findings to Member 2.

### Required Features
- Simulated Bug Bounty connector
- Vulnerability Scanner connector
- EDR/XDR connector
- SIEM connector
- IAM connector
- Threat Intelligence connector
- Asset Inventory connector
- JSON/CSV ingestion
- Source status tracking
- Basic input validation

### Required Data
```text
assets.json
bug_bounty.json
vulnerabilities.json
xdr_events.json
siem_events.json
iam.json
threat_intelligence.json
controls.json
```

### Required APIs
```text
GET  /api/sources
GET  /api/raw-findings
POST /api/ingest/{source}
```

### Output to Member 2
```text
Raw security findings from all sources
```

---

## Member 2 — Correlation & Asset Intelligence Engineer

### Responsibility
Convert different security-tool outputs into unified findings and correlate them with assets and business services.

### Required Features
- Unified Finding Schema
- Severity normalization
- Asset resolution
- Finding deduplication
- Cross-source correlation
- Evidence confidence score
- Asset-to-business-service mapping
- Asset criticality calculation
- Control posture/effectiveness calculation

### Required Functions
```text
normalize_finding()
resolve_asset()
deduplicate_findings()
correlate_findings()
calculate_confidence()
calculate_asset_criticality()
calculate_control_effectiveness()
```

### Required APIs
```text
GET /api/findings
GET /api/risk-cases
GET /api/assets
GET /api/assets/{id}
GET /api/assets/{id}/controls
```

### Output to Member 3
```text
Risk Case
Asset
Business Service
Asset Criticality
Evidence Confidence
Internet Exposure
Control Effectiveness
Threat Evidence
```

---

## Member 3 — Cyber Risk Quantification Engineer

### Responsibility
Convert correlated cyber risks into risk scores and monetary exposure.

### Required Features
- Incident likelihood calculation
- Technical/business risk score
- Financial impact calculation
- Expected Annual Loss (EAL)
- Enterprise total exposure
- Asset-level exposure
- Business-service exposure
- Risk driver calculation
- Optional Monte Carlo / P95 loss

### Risk Inputs
```text
Vulnerability Severity
Exploitability
Threat Activity
Internet Exposure
Asset Criticality
Control Weakness
Incident History
Evidence Confidence
```

### Financial Impact Components
```text
Downtime Cost
Incident Response Cost
Recovery Cost
Data Breach Cost
Legal / Regulatory Cost
Customer Impact
Reputation Impact
```

### Required Functions
```text
calculate_likelihood()
calculate_risk_score()
calculate_loss_magnitude()
calculate_eal()
calculate_enterprise_exposure()
identify_risk_drivers()
```

### Required APIs
```text
GET /api/risks
GET /api/risks/top
GET /api/risk-cases/{id}/risk
GET /api/dashboard/risk-summary
```

### Output
```text
Risk Score
Likelihood
Potential Financial Impact
Expected Annual Loss
Risk Level
Top Risk Drivers
```

---

## Member 4 — AI & Risk Intelligence Engineer

### Responsibility
Explain risk results, generate prioritized recommendations, and provide the AI Risk Advisor.

### Required Features
- Risk explanation
- Risk-driver explanation
- Mitigation recommendation generation
- Natural-language query interface
- Backend tool/API routing
- Optional anomaly detection
- Optional future-risk prediction

### Required AI Questions
```text
What is our highest financial cyber risk?
Why is Payment API high risk?
Which vulnerabilities should we fix first?
What are the top risk drivers?
Which business service has the highest exposure?
What happens if we enable MFA?
What should we do with ₹50 lakh?
```

### Important Rule
```text
AI must retrieve calculated values from backend APIs.
AI must not invent risk or financial numbers.
```

### Required Functions
```text
explain_risk()
recommend_mitigations()
answer_question()
route_intent()
```

### Required API
```text
POST /api/assistant/query
```

---

## Member 5 — Decision Optimization & Compliance Engineer

### Responsibility
Calculate residual risk after mitigation and recommend the best security investments under a budget.

### Required Features
- Mitigation catalog
- Scenario simulator
- Before/after risk comparison
- Residual EAL calculation
- Remediation delay simulation
- Mitigation cost calculation
- Risk-reduction calculation
- ROSI calculation
- Budget optimization
- Basic framework mapping

### Required Scenarios
```text
Enable MFA
Patch Critical Vulnerability
Deploy/Expand EDR
Add Network Segmentation
Remove Internet Exposure
Improve Backup
Delay Remediation by 30 Days
```

### Required Optimization
```text
Input:
Security Budget

Output:
Recommended Mitigations
Total Cost
Expected Risk Reduction
Residual EAL
Unused Budget
ROSI
```

### Required Frameworks
```text
ISO/IEC 27001
NIST CSF
CIS Controls
RBI Cyber Security Framework
SEBI Cybersecurity / Cyber Resilience Framework
```

### Required Functions
```text
simulate_mitigation()
calculate_residual_risk()
calculate_rosi()
optimize_budget()
map_framework_controls()
```

### Required APIs
```text
POST /api/scenario
POST /api/optimize
GET  /api/compliance
```

---

## Member 6 — Frontend & Integration Engineer

### Responsibility
Build the complete user interface and integrate all member APIs into one working product.

### Required Pages

```text
/dashboard
/sources
/findings
/assets
/risks
/scenarios
/investments
/compliance
```

### Dashboard Must Show
```text
Enterprise Risk Score
Expected Annual Loss
P95 Loss (if implemented)
Risk Trend
Top Financial Risks
Top Risk Drivers
Recommended Actions
Security Source Status
```

### Findings Page
Show:
```text
Finding
Source
Asset
Severity
Status
Confidence
Related Risk Case
```

### Risk Page
Show:
```text
Risk Case
Asset
Business Service
Evidence Sources
Criticality
Likelihood
Financial Impact
EAL
Risk Drivers
Recommended Mitigation
```

### Scenario Page
Show:
```text
Current Risk
Selected Mitigation
Current EAL
Residual EAL
Risk Reduction
Implementation Cost
```

### Investment Page
Input:
```text
Budget in ₹
```

Output:
```text
Selected Security Controls
Total Investment
Current EAL
Residual EAL
Expected Risk Reduction
ROSI
```

### AI Advisor
Provide a chat/query box connected to:

```text
POST /api/assistant/query
```

---

# Required Prototype Risk Cases

Create at least these five demo cases.

## 1. Payment API
```text
Bug Bounty Authentication Bypass
+ XDR Suspicious Authentication
+ SIEM Login Events
+ Weak MFA
+ Critical Business Service
→ Critical Financial Risk
```

## 2. Customer Database
```text
Critical Vulnerability
+ Sensitive Customer Data
+ Weak Segmentation
→ High Financial Risk
```

## 3. Cloud IAM
```text
Overprivileged Account
+ Missing MFA
+ Cloud Exposure
→ High Identity Risk
```

## 4. Employee Endpoint
```text
EDR Malware Alert
+ Normal Business Asset
→ Medium Risk
```

## 5. Test Server
```text
CVSS 10
+ Isolated Environment
+ No Sensitive Data
+ Low Business Criticality
→ Low Financial Risk
```

The fifth case demonstrates that technical severity alone does not equal business risk.

---

# Minimum Database Tables

```text
sources
assets
business_services
findings
risk_cases
controls
risk_calculations
mitigations
scenarios
framework_mappings
risk_history
```

---

# Minimum API Set

```text
GET  /api/sources
GET  /api/findings
GET  /api/risk-cases
GET  /api/risk-cases/{id}
GET  /api/assets
GET  /api/risks/top
GET  /api/dashboard
POST /api/scenario
POST /api/optimize
GET  /api/compliance
POST /api/assistant/query
```

---

# Required Technology Stack

```text
Frontend:
React + TypeScript

Backend:
Python + FastAPI

Database:
MySQL

Data Processing:
Pandas + NumPy

Optimization:
Google OR-Tools or prototype knapsack

Charts:
Recharts

Deployment:
Docker / Docker Compose

Version Control:
Git + GitHub
```

---

# Integration Contract

```text
Member 1
Security Sources
     ↓
Raw Findings

Member 2
Raw Findings
     ↓
Unified Correlated Risk Cases

Member 3
Risk Cases
     ↓
Risk Score + ₹ Financial Exposure

Member 4
Risk Results
     ↓
Explanation + Recommendations + AI Answers

Member 5
Risk + Recommendations
     ↓
Scenario Results + Optimized Investment Plan

Member 6
All APIs
     ↓
Complete User Interface
```

---

# MVP Completion Checklist

- [ ] Security-source demo datasets created
- [ ] Data ingestion working
- [ ] Unified finding schema working
- [ ] Asset resolution working
- [ ] Duplicate findings handled
- [ ] Cross-source correlation working
- [ ] Asset criticality calculated
- [ ] Control effectiveness calculated
- [ ] Risk score calculated
- [ ] Financial impact calculated
- [ ] EAL calculated in ₹
- [ ] Risk drivers displayed
- [ ] Mitigation recommendations generated
- [ ] Scenario simulation working
- [ ] Budget optimization working
- [ ] Basic compliance mapping working
- [ ] Executive dashboard working
- [ ] AI Risk Advisor connected to backend
- [ ] Five demo risk cases working end-to-end
