# CRISPR - System Architecture

> **Cyber Risk Intelligence System for Prioritized Remediation**
> Team PowerHouse · SIH 2026 · PS-26105 · AICTE Cyber Security Cell

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Backend Module Architecture](#5-backend-module-architecture)
6. [AI Layer Architecture](#6-ai-layer-architecture)
7. [ML Pipeline Architecture](#7-ml-pipeline-architecture)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Database Schema](#9-database-schema)
10. [API Architecture](#10-api-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Security Architecture](#12-security-architecture)

---

## 1. Platform Overview

CRISPR is a six-layer, microservice-based platform that ingests raw security telemetry from enterprise tools, converts it into financial risk exposure denominated in Indian Rupees (₹), and produces actionable investment recommendations bounded by a user-specified budget.

The platform is built to operate entirely on-premise with zero data egress, satisfying the data residency requirements of the RBI Cyber Security Framework and India's Digital Personal Data Protection (DPDP) Act 2023.

**Core design principles:**

- **FAIR methodology** — every ₹ figure traces back to an auditable FAIR calculation (TEF × (1 − CE) × LM)
- **India-first regulatory layer** — RBI, SEBI CSCRF, DPDP Act penalties are first-class inputs to the financial model
- **Deterministic before AI** — every answer from the AI advisor is backed by a deterministic template; the LLM only polishes phrasing and passes through a number guardrail before the answer is returned
- **Modular connector pattern** — each data source (SIEM, EDR, IAM, etc.) is a thin adapter behind a common `fetch_findings()` interface; adding a new source requires one file, not a rearchitecture

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph SOURCES["Data Sources — Enterprise Security Tools"]
        VS[Vulnerability Scanner]
        SIEM[SIEM / SOC]
        EDR[EDR / XDR]
        IAM[IAM / Identity]
        TI[Threat Intelligence]
        BB[Bug Bounty]
        CERTIN[CERT-In Advisories]
    end

    subgraph INGESTION["Layer 1 — Ingestion & Normalization"]
        CON[Connector Adapters]
        NORM[Normalizer]
        STORE[PostgreSQL Store]
        SEED[Demo Seeder]
    end

    subgraph CORRELATION["Layer 2 — Correlation Engine"]
        RES[Asset Resolver]
        CORR[Finding Correlator]
        REG[Asset Registry]
    end

    subgraph RISKENGINE["Layer 3 — Risk & Financial Engine"]
        LH[Likelihood Calculator]
        LOSS[Loss Magnitude Calculator]
        EAL[EAL / VaR Engine]
        DRIV[Risk Driver Identifier]
        CRIT[Asset Criticality Scorer]
        CE[Control Effectiveness Evaluator]
    end

    subgraph AI["Layer 4 — AI Decision Support"]
        QE[NL Query Engine]
        GUARD[Number Guardrail]
        LLM[LLM Client — Optional]
        FORE[EAL Forecaster]
        ANOM[Anomaly Detector]
        ML[Incident Predictor]
        SHAP[Explainability — SHAP-style]
    end

    subgraph OPT["Layer 5 — Investment Optimizer"]
        KNAP[Knapsack Optimizer — PuLP + Greedy]
        SIM[Scenario Simulator]
        COMP[Compliance Mapper]
    end

    subgraph PRESENT["Layer 6 — Presentation"]
        API[FastAPI Backend]
        FE[React Frontend — TypeScript]
        PROD[Lovable Product Shell]
        BUGB[Bug Bounty Portal]
    end

    SOURCES --> INGESTION
    INGESTION --> CORRELATION
    CORRELATION --> RISKENGINE
    RISKENGINE --> AI
    RISKENGINE --> OPT
    AI --> PRESENT
    OPT --> PRESENT
```

---

## 3. Component Architecture

```mermaid
graph LR
    subgraph backend["backend/"]
        direction TB
        MAIN["app/main.py\nFastAPI entry point"]
        INGMAIN["app/ingestion_main.py\nIngestion service"]

        subgraph api["app/api/"]
            R_RISK["risks.py"]
            R_ASSET["assets.py"]
            R_SCEN["scenarios.py"]
            R_OPT["optimization.py"]
            R_COMP["compliance.py"]
            R_ASS["assistant.py"]
            R_FIND["findings.py"]
            R_AUTH["auth.py"]
            R_BB["bug_bounty.py"]
            R_ING["ingestion.py"]
        end

        subgraph modules["Core Modules"]
            CONN["connectors/\nVS · EDR · XDR · SIEM\nIAM · ThreatIntel · BugBounty"]
            NORM_M["normalization/\nnormalizer.py"]
            CORR_M["correlation/\ncorrelator.py · resolver.py\nassets_registry.py · service_mapping.py"]
            RE["risk_engine/\nlikelihood.py · drivers.py"]
            FE_M["financial_engine/\nloss_calculator.py"]
            ASINT["asset_intelligence/\ncriticality.py"]
            CTL["controls/\neffectiveness.py"]
            OPT_M["optimizer/\nknapsack.py"]
            SCE_M["scenario_engine/\nsimulator.py"]
            COMP_M["compliance/\nmapper.py"]
            ING_M["ingestion/\nstore.py · seed.py"]
            DB["database/\nconnection.py"]
            CONST["constants.py\nINDIA_PENALTIES · DOWNTIME_COST"]
        end

        MAIN --> api
        INGMAIN --> api
        api --> modules
    end

    subgraph ailayer["ai/"]
        QE_A["assistant/\nquery_engine.py"]
        TOOLS["tools/\nrisk_tools.py\nscenario_tools.py\noptimize_tools.py\nllm.py\nformatting.py\nguardrail.py"]
        QE_A --> TOOLS
    end

    subgraph mllayer["ml/"]
        IP["incident_prediction/\nmodel.py"]
        AD["anomaly_detection/\ndetector.py"]
        FORE_M["forecasting/\ntrend.py"]
        EX["explainability/\nshap_wrapper.py"]
    end

    subgraph frontend["frontend/ & crispr_products/"]
        FE_P["Pages — 20+ route pages"]
        FE_C["Components — charts · layout · common · dashboard"]
        FE_S["Services — api.ts · store.ts"]
    end

    backend --> ailayer
    ailayer --> mllayer
    backend --> mllayer
    backend --> frontend
```

---

## 4. Data Flow Architecture

```mermaid
sequenceDiagram
    participant SRC as Security Source
    participant CON as Connector Adapter
    participant DB as PostgreSQL
    participant NORM as Normalizer
    participant CORR as Correlator
    participant RISK as Risk Engine
    participant FIN as Financial Engine
    participant AI as AI Advisor
    participant FE as Frontend

    SRC->>CON: Raw JSON / API response
    CON->>DB: upsert_findings() — store raw payload
    CON->>NORM: fetch findings for normalization
    NORM->>NORM: validate source_type enum, severity map,\nasset_id presence, confidence float
    NORM->>CORR: List[Finding] — validated objects
    CORR->>CORR: Group by asset_id\nCompute confidence = BASE + Σ source_boosts
    CORR->>RISK: RiskCase objects with business_criticality
    RISK->>RISK: calculate_likelihood(cvss, exploit_in_wild,\npatch_age, internet_facing, CE, threat_intel)
    RISK->>FIN: likelihood + asset record
    FIN->>FIN: LM = downtime + IR + recovery\n+ data_breach + regulatory + reputation
    FIN->>FIN: EAL = likelihood × LM\nVaR = EAL × 3.2
    FIN->>AI: risk_cases with eal_inr, var_95_inr
    AI->>AI: route_intent() → keyword match → LLM fallback
    AI->>AI: handler() → fetch live figures from risk tools
    AI->>AI: guardrail_validate() — redact invented numbers
    AI->>FE: {answer, data, intent, engine}
    FE->>FE: Render ₹ figures, charts, compliance maps
```

---

## 5. Backend Module Architecture

### 5.1 Connector Layer

```mermaid
graph TD
    BASE["connectors/base.py\nfetch_source(source_type, filename)\nsource_info()"]

    VS_C["vulnerability_scanner/\nconnector.py"]
    EDR_C["edr/connector.py"]
    XDR_C["xdr/connector.py"]
    SIEM_C["siem/connector.py"]
    IAM_C["iam/connector.py"]
    TI_C["threat_intel/connector.py"]
    BB_C["bug_bounty/connector.py\n+ PostgreSQL accepted reports"]

    BASE --> VS_C
    BASE --> EDR_C
    BASE --> XDR_C
    BASE --> SIEM_C
    BASE --> IAM_C
    BASE --> TI_C

    DB[("PostgreSQL\nfindings table")]
    JSON[("data/demo/\n*.json files")]

    BB_C --> DB
    BB_C --> JSON
    BASE --> DB
    BASE --> JSON

    note["All connectors implement:\nfetch_findings() → list[dict]\nget_source_info() → dict\nDatabase-first, JSON fallback"]
```

### 5.2 Risk & Financial Engine

```mermaid
graph TD
    subgraph risk["risk_engine/"]
        LH["likelihood.py\ncalculate_likelihood(\n  cvss, exploit_in_wild, patch_age_days,\n  internet_facing, control_effectiveness,\n  threat_intel_active\n) → float 0.0–0.95\n\nWeights:\n  CVSS: 25%\n  Exploit: 20%\n  Patch age: 15%\n  Internet: 15%\n  Control gap: 15%\n  Threat intel: 10%"]

        DRV["drivers.py\nidentify_risk_drivers(\n  asset, finding, controls\n) → list[{factor, points, direction}]\n\nFactors: internet-facing (+20)\ncritical service (+18)\nbug bounty validated (+17)\nmulti-source confirmed (+14)\nMFA gap (variable)\nEDR coverage (−8)\nWAF active (−6)"]
    end

    subgraph fin["financial_engine/"]
        LOSS["loss_calculator.py\ncalculate_loss_magnitude(asset)\n\nComponents:\n  downtime_loss = hours × hourly_rate × criticality\n  ir_cost = 300K + criticality×500K\n  recovery_cost = 200K + criticality×600K\n  data_breach = value_inr × 15% (if sensitivity≥4)\n  regulatory = CERT-In + RBI + DPDP×5%\n  reputation = value_inr × 8% × criticality\n\n→ {total_inr, breakdown}"]

        EAL_C["calculate_eal(likelihood, loss_magnitude)\n\nEAL = likelihood × loss_magnitude.total_inr\nVaR 95% = EAL × 3.2\nrisk_score = min(likelihood×100 + total_loss/1M, 100)\n\n→ {eal_inr, eal_lakh, var_95_inr, risk_score}"]
    end

    subgraph const["constants.py"]
        CONST["INDIA_PENALTIES:\n  cert_in_non_reporting: ₹5L\n  rbi_non_reporting: ₹5L\n  rbi_major_violation: ₹1Cr\n  sebi_non_compliance: ₹1L/day\n  dpdp_breach: ₹25Cr\n\nDOWNTIME_COST_PER_HOUR:\n  payment_server: ₹10L/hr\n  api_gateway: ₹8L/hr\n  database: ₹7L/hr\n  web_app: ₹2L/hr"]
    end

    LH --> EAL_C
    LOSS --> EAL_C
    CONST --> LOSS
```

### 5.3 Correlation Engine

```mermaid
graph TD
    subgraph corr["correlation/"]
        RES["resolver.py\nresolve_asset(raw, known_assets)\n→ canonical asset_id\nFallback: case-insensitive name match"]

        NORM_P["normalizer.py (normalization/)\nnormalize_finding(raw) → Finding | None\nDrops: missing asset_id or finding_id\nMaps: severity strings → Severity enum\nValidates: source_type enum\n\ndeduplicate_findings() — keeps highest confidence\nper (asset_id, cve/finding_type) key"]

        CORR_P["correlator.py\ncorrelate_findings(\n  findings, asset_names, criticality_lookup\n)\n\nConfidence = BASE(0.60) + Σ source_boosts:\n  BUG_BOUNTY: +0.15\n  XDR: +0.10\n  THREAT_INTEL: +0.10\n  SIEM: +0.08\n  IAM: +0.07\n  EDR: +0.05\n  cap: 1.00\n\n→ List[RiskCase] sorted by confidence desc"]

        SMAP["service_mapping.py\nmap_asset_to_service(asset_id)\n→ business_service string"]

        AREG["assets_registry.py\nKNOWN_ASSETS dict\nA001: Payment Gateway\nA002: Payment Database\nA003: Authentication API\nA004: Customer Portal\nA005: HR Portal\nA006: Test Server"]
    end

    RES --> NORM_P
    NORM_P --> CORR_P
    AREG --> CORR_P
    SMAP --> CORR_P
```

### 5.4 Investment Optimizer

```mermaid
graph TD
    subgraph opt["optimizer/knapsack.py"]
        CAT["CONTROLS Catalogue — 7 controls:\n  MFA: cost ₹15L → reduces ₹48.6L\n  Patching: cost ₹8L → reduces ₹31L\n  Segmentation: cost ₹30L → reduces ₹38.7L\n  EDR expand: cost ₹20L → reduces ₹25L\n  Cloud hardening: cost ₹15L → reduces ₹18L\n  Backup: cost ₹6L → reduces ₹9L\n  Training: cost ₹3L → reduces ₹5L"]

        PULP["PuLP ILP Solver (primary)\nMaximize Σ risk_reduction_inr × x_i\nSubject to: Σ cost_inr × x_i ≤ budget\nx_i ∈ {0, 1} — binary selection"]

        GREED["Greedy Fallback\nSort by reduction/cost ratio\nPick while budget remaining"]

        OUT["Output:\n  selected_controls: list\n  spent_inr, remaining_inr\n  total_reduction_inr\n  total_risk_reduction_pct\n  rosi = (reduction - spent) / spent\n  solver: 'pulp' | 'greedy'"]
    end

    CAT --> PULP
    CAT --> GREED
    PULP --> OUT
    GREED --> OUT
```

### 5.5 Scenario Engine

```mermaid
graph TD
    subgraph sce["scenario_engine/simulator.py"]
        PRE["PRESET_SCENARIOS:\n  mfa — ₹15L cost, ₹48.6L reduction\n  patch_now — ₹8L cost, ₹31L reduction\n  segment — ₹30L cost, ₹38.7L reduction\n  delay_30 — ₹0 cost, −₹21L (increases risk)"]

        CAL["CALIBRATED_IMPACTS dict\nEnsures demo targets are hit exactly\nDistributes reduction per-asset by EAL share"]

        SIM["simulate_enterprise(assets, overrides)\n1. Translate overrides → control_overrides\n2. Compute baseline EAL per asset\n3. Apply calibrated impact (if preset)\n4. Return per_asset + enterprise totals"]

        OUT2["Output:\n  before_total_eal_inr / _lakh\n  after_total_eal_inr / _lakh\n  reduction_inr / _lakh / _pct\n  per_asset: list of asset-level deltas"]
    end

    PRE --> SIM
    CAL --> SIM
    SIM --> OUT2
```

### 5.6 Compliance Mapper

```mermaid
graph TD
    subgraph comp["compliance/mapper.py"]
        FW["5 Frameworks:\n  ISO 27001: 76%\n  NIST CSF: 82%\n  CIS Controls: 85%\n  RBI CSF: 72% ← lowest\n  SEBI CSCRF: 81%"]

        CTRL["Control → Framework mapping:\n  MFA → RBI:IAM-3, NIST:PR.AC-7,\n         ISO:A.9.4.2, CIS-6, SEBI:AC-2\n  Patching → RBI:VM-2, NIST:PR.IP-12, etc.\n  Segmentation, EDR, Backup — all mapped"]

        GAPS["5 Compliance Gaps:\n  MFA gap: 42% without MFA → ₹48.6L impact\n  Patch lag: 21-day lag on critical CVE → ₹31L\n  Segmentation: payment env not segmented → ₹38.7L\n  EDR: incomplete on non-critical endpoints → ₹25L\n  Backup: no immutable backup on payment DB → ₹9L"]
    end

    FW --> GAPS
    CTRL --> GAPS
```

---

## 6. AI Layer Architecture

```mermaid
graph TD
    subgraph ailay["ai/"]
        subgraph qe["assistant/query_engine.py"]
            ROUTE["route_intent(question)\n\nKeyword matching — 8 intent patterns:\n  top_risk, patch_delay_scenario\n  mfa_scenario, budget_optimize\n  risk_drivers, forecast\n  anomaly_scan, enterprise_summary\n\nLLM fallback via route_with_llm()\nif no keyword matches"]

            HAND["Intent Handlers:\n  _answer_top_risk() → enterprise summary\n  _answer_risk_drivers() → fuzzy asset match\n  _answer_mfa() → scenario simulation\n  _answer_patch_delay() → 30/60/90 day sim\n  _answer_budget() → extract_budget_inr + optimize\n  _answer_forecast() → 90-day EAL projection\n  _answer_anomalies() → Isolation Forest results\n  _answer_enterprise() → portfolio summary\n  _help_answer() → fallback with examples"]

            GUARD["guardrail_validate(llm_text, data)\n\n1. collect_allowed_values(data) — walk all\n   numeric fields including lakh/crore expansions\n2. Extract ₹ claims from LLM output via regex\n3. Match each claim against allowed set\n   tolerance: 1.5% relative OR ₹5000 absolute\n4. Redact unmatched claims → [redacted]\n5. ok=False → use deterministic template instead"]
        end

        subgraph tools["ai/tools/"]
            RT["risk_tools.py\nIn-process calls to backend API routes\nget_enterprise_summary()\nget_all_risks()\nget_asset_risk(asset_id)\nfind_risk_by_question(question) — fuzzy match"]

            ST["scenario_tools.py\nDirect calls to simulator.py (not HTTP)\nsimulate_mfa()\nsimulate_patch_delay(days)\nsimulate_patching_now()\nsimulate_segmentation()"]

            OT["optimize_tools.py\noptimize_investment(budget_inr)\nlist_controls()"]

            FMT["formatting.py\nformat_inr(value) → ₹X.XX crore / lakh\nformat_pct(value) → X.X%\nextract_budget_inr(question)\n  regex: crore → ×1Cr, lakh → ×1L"]

            LLM_T["llm.py\nOpenAI-compatible client (httpx)\nMODEL_REGISTRY by task:\n  route: kr/gpt-5.6-sol\n  explain: kr/claude-opus-5-thinking\n  mitigate: kr/gpt-5.6-sol-thinking\nFallback chain per task\nAvailability TTL: 60s\nReturns None on any failure"]
        end
    end

    ROUTE --> HAND
    HAND --> RT
    HAND --> ST
    HAND --> OT
    HAND --> GUARD
    GUARD --> LLM_T
```

---

## 7. ML Pipeline Architecture

```mermaid
graph TD
    subgraph ml["ml/"]
        subgraph ip["incident_prediction/model.py"]
            PRED["predict_incident(\n  cvss, exploit_in_wild, patch_age_days,\n  internet_facing, control_effectiveness\n)\n\nWeighted additive model V1:\n  exploit_availability: 30%\n  network_exposure: 20%\n  patch_latency: 20%\n  control_weakness: 15%\n  severity (CVSS): 15%\n\nOutput: probability 0.02–0.95\n+ contributions dict (sums to probability)\n\nV2 hook: XGBoost swap-in behind same signature"]
        end

        subgraph ad["anomaly_detection/detector.py"]
            ISO["detect_anomalies()\n\n1. Load SIEM events → extract auth signals\n2. Build per-asset features:\n   historical_failure_rate (30d)\n   recent_failure_rate (7d)\n   failure_rate_change\n   peak_daily_failure_rate\n   auth_signal_count\n3. sklearn IsolationForest\n   n_estimators=200\n   contamination=adaptive (15%-25%)\n4. Return anomalies sorted by anomaly_score\n5. Optional LLM narrative via llm.chat()"]
        end

        subgraph fore["forecasting/trend.py"]
            TREND["forecast_eal(\n  base_eal_inr, horizon=90d,\n  step=15d, daily_growth=0.77%/day\n)\n\nLinear compound growth:\n  day_N = base × (1 + rate × N)\n\nSummary: start→end, increase_inr, increase_pct\nmodel: 'linear_v1' (time-series V2 planned)"]
        end

        subgraph ex["explainability/shap_wrapper.py"]
            SHAP["explain_contributions(contributions)\n\nFormats risk_engine contributions as:\n  {feature, label, impact, share_pct, direction}\n\nDirections: increases_risk / reduces_risk\nV2 hook: shap.TreeExplainer plug-in point"]
        end
    end

    ip --> ad
    ip --> fore
    ip --> ex
```

---

## 8. Frontend Architecture

```mermaid
graph TD
    subgraph fe["frontend/ — React + TypeScript"]
        subgraph pages["src/pages/ — 20 route pages"]
            SD["SecurityDashboard.tsx"]
            FD["FinancialDashboard.tsx"]
            RK["Risks.tsx"]
            SC["Scenarios.tsx"]
            INV["Investments.tsx"]
            COMP_P["Compliance.tsx"]
            FIND["Findings.tsx"]
            ASSET["Assets.tsx"]
            TI_P["ThreatIntelligence.tsx"]
            VULN["Vulnerabilities.tsx"]
            REC["Recommendations.tsx"]
            RQ["RemediationQueue.tsx"]
            CS["CodeSecurity.tsx"]
            CLD["CloudSecurity.tsx"]
            IS["IdentitySecurity.tsx"]
            SS["ScaSbom.tsx"]
            SEC["Secrets.tsx"]
            POL["Policies.tsx"]
            REP["Reports.tsx"]
            SET["Settings.tsx"]
        end

        subgraph comp_fe["src/components/"]
            CHARTS["charts/\n  ComplianceRadar.tsx\n  FinancialBreakdownBar.tsx\n  InteractiveTrendChart.tsx\n  RiskDonut.tsx\n  RiskTrendChart.tsx"]

            DASH_C["dashboard/\n  FindingsSummary.tsx\n  RiskPostureCard.tsx\n  SecurityInsights.tsx\n  SecurityPipeline.tsx"]

            COMMON["common/ — 20 shared UI components\n  AIAdvisorChat.tsx\n  KPICard.tsx\n  DataTable.tsx\n  CommandPalette.tsx\n  Terminal.tsx\n  RiskScoreBadge.tsx\n  SeverityBadge.tsx\n  CountUp.tsx\n  Carousel.tsx\n  FilterBar.tsx\n  + 10 more"]

            AP["attackpath/\n  AttackPathGraph.tsx\n  NodeDetailPanel.tsx"]

            LAYOUT["Layout/\n  Sidebar.tsx\n  TopBar.tsx"]
        end

        subgraph lib_fe["src/lib/ & src/services/"]
            API_C["api/client.ts — axios wrapper"]
            STORE["store.ts — Zustand state"]
            TOAST["toastStore.ts"]
            UI_S["uiStore.ts"]
        end

        subgraph demo_fe["src/demo/"]
            DS["demoStore.ts — mock state"]
            EB["eventBus.ts — live event sim"]
            FIX["fixtures.ts — demo data"]
        end
    end

    subgraph prod["crispr_products/ — Lovable product shell"]
        subgraph routes_p["src/routes/"]
            DASH_R["dashboard.tsx"]
            FIN_R["financial.tsx"]
            BUD_R["budget.tsx"]
            COMP_R["compliance.tsx"]
            SCEN_R["scenarios.tsx"]
            ADV_R["advisor.tsx"]
            ARCH_R["architecture.tsx"]
            HOW_R["how-it-works.tsx"]
            CORR_R["correlation.tsx"]
            DRIV_R["drivers.tsx"]
            PIP_R["pipeline.tsx"]
            REC_R["recommendations.tsx"]
        end

        subgraph crispr_comp["src/components/crispr/"]
            ANIM["animated-number.tsx"]
            DIAL["score-dial.tsx"]
            SHELL["shell.tsx"]
        end

        subgraph lib_p["src/lib/"]
            DATA["crispr-data.ts — typed risk data"]
        end
    end
```

---

## 9. Database Schema

```mermaid
erDiagram
    USERS {
        UUID user_id PK
        VARCHAR name
        VARCHAR email UK
        TEXT password_hash
        VARCHAR role "REPORTER | SECURITY"
        TIMESTAMPTZ created_at
    }

    BUG_BOUNTY_REPORTS {
        UUID report_id PK
        UUID reporter_user_id FK
        VARCHAR reporter_name
        VARCHAR reporter_email
        VARCHAR title
        VARCHAR asset_id
        VARCHAR weakness
        VARCHAR severity "CRITICAL|HIGH|MEDIUM|LOW"
        TEXT description
        TEXT impact
        TEXT reproduction_steps
        TEXT remediation
        VARCHAR cve
        VARCHAR status "SUBMITTED|ACCEPTED|REJECTED"
        TEXT triage_notes
        VARCHAR reviewed_by
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ASSETS {
        VARCHAR asset_id PK
        JSONB payload
        TIMESTAMPTZ updated_at
    }

    FINDINGS {
        VARCHAR finding_id PK
        VARCHAR source_type
        VARCHAR source_name
        VARCHAR asset_id
        JSONB payload
        DATE first_seen
        TIMESTAMPTZ ingested_at
    }

    USERS ||--o{ BUG_BOUNTY_REPORTS : "submits"
    ASSETS ||--o{ FINDINGS : "has"
    ASSETS ||--o{ BUG_BOUNTY_REPORTS : "referenced by"
```

---

## 10. API Architecture

```mermaid
graph LR
    subgraph main_api["FastAPI — backend/app/main.py\nport 8000"]
        F["/api/findings"]
        A["/api/assets"]
        R["/api/risks"]
        SC_A["/api/scenarios"]
        O["/api/optimize"]
        C["/api/compliance"]
        AS["/api/assistant"]
        H["/api/health"]
    end

    subgraph ing_api["FastAPI — backend/app/ingestion_main.py\nport 8001"]
        AUTH["/api/auth\n  POST /register\n  POST /login\n  GET /me"]
        BB["/api/bug-bounty\n  POST /reports\n  GET /reports\n  GET /reports/{id}\n  PATCH /reports/{id}/review"]
        ING["/api/ingestion\n  GET /status\n  POST /refresh"]
        FIND_ING["/api/findings"]
    end

    subgraph endpoints["Key Endpoints"]
        R1["GET /api/risks\n→ all risk cases ranked by EAL"]
        R2["GET /api/risks/enterprise\n→ portfolio summary + top risk"]
        R3["GET /api/risks/{asset_id}\n→ single asset risk case"]
        S1["GET /api/scenarios\n→ what-if with query params"]
        S2["GET /api/scenarios/presets\n→ 4 preset scenarios with ROSI"]
        O1["POST /api/optimize\n→ {budget_inr} → selected controls"]
        O2["GET /api/optimize/controls\n→ full control catalogue"]
        AI1["POST /api/assistant/query\n→ {question} → NL answer"]
        AI2["GET /api/assistant/forecast\n→ 90-day EAL trajectory"]
        AI3["GET /api/assistant/anomalies\n→ Isolation Forest results"]
    end

    main_api --> endpoints
```

---

## 11. Deployment Architecture

```mermaid
graph TB
    subgraph docker["Docker Compose — single command startup"]
        NGINX["Nginx\nReverse Proxy\nport 80"]

        FE_D["Frontend\nReact + Vite\nport 5173"]

        BE_D["Backend API\nFastAPI + Uvicorn\nport 8000"]

        ING_D["Ingestion API\nFastAPI + Uvicorn\nport 8001"]

        PG["PostgreSQL 16\ncrispr database\nport 5432"]

        REDIS["Redis (optional)\nSession cache"]
    end

    DEV["Developer\nbrowser"]

    DEV --> NGINX
    NGINX --> FE_D
    NGINX --> BE_D
    NGINX --> ING_D
    BE_D --> PG
    ING_D --> PG
    BE_D --> REDIS

    subgraph data["data/demo/ — Seed Files"]
        AJ["assets.json — 6 enterprise assets"]
        VJ["vulnerabilities.json — CVE findings"]
        EJ["edr_events.json"]
        XJ["xdr_events.json"]
        SJ["siem_events.json"]
        IJ["iam.json"]
        TJ["threat_intel.json"]
        BJ["bug_bounty.json"]
    end

    ING_D --> data
    BE_D --> data
```

---

## 12. Security Architecture

```mermaid
graph TD
    subgraph auth["Authentication — backend/app/auth.py"]
        PWD["Password Hashing\nPBKDF2-SHA256\n600,000 iterations\nRandom 16-byte salt"]

        TOK["Token Generation\nHMAC-SHA256 signed\n12-hour expiry\nBase64url encoded payload"]

        ROLE["Role-Based Access Control\n  REPORTER — submit/view own reports\n  SECURITY — all reports + triage + ingestion"]

        MW["FastAPI Dependency Injection\nget_current_user() — validates every request\nrequire_security() — enforces SECURITY role"]
    end

    subgraph guardrail_sec["AI Number Guardrail — ai/tools/guardrail.py"]
        GUARD2["Prevents AI from inventing ₹ figures\n\n1. Walk all API response data → allowed_values set\n2. Extract money patterns from LLM output\n   regex: ₹/Rs/INR + amount + unit\n3. Match: 1.5% relative tolerance OR ₹5000 absolute\n4. Redact unmatched → [redacted]\n5. Caller falls back to deterministic template"]
    end

    subgraph zero["Zero Egress Design"]
        ZE["All processing on-premise\nNo data sent to external LLMs by default\nLLM_ENABLED=false → pure template mode\nLLM_BASE_URL configurable to internal endpoint\nSatisfies: RBI CSF data residency\n            DPDP Act 2023 data localisation\n            CERT-In on-premise requirement"]
    end

    auth --> guardrail_sec
    guardrail_sec --> zero
```

---

## Appendix: Key Files Quick Reference

| File | Owner | Purpose |
|---|---|---|
| `backend/constants.py` | Shared | India penalty constants, downtime costs |
| `backend/risk_engine/likelihood.py` | Member 3 | FAIR likelihood formula |
| `backend/financial_engine/loss_calculator.py` | Member 3 | Loss magnitude + EAL |
| `backend/risk_engine/drivers.py` | Member 3 | Risk factor explanation |
| `backend/correlation/correlator.py` | Member 2 | Multi-source confidence engine |
| `backend/normalization/normalizer.py` | Member 2 | Finding validation pipeline |
| `backend/optimizer/knapsack.py` | Member 5 | PuLP + greedy optimizer |
| `backend/scenario_engine/simulator.py` | Member 5 | What-if simulation |
| `backend/compliance/mapper.py` | Member 5 | Framework mapping |
| `ai/assistant/query_engine.py` | Member 4 | NL intent routing |
| `ai/tools/guardrail.py` | Member 4 | Number hallucination prevention |
| `ml/anomaly_detection/detector.py` | Member 4 | Isolation Forest login anomaly |
| `ml/forecasting/trend.py` | Member 4 | EAL growth projection |
| `backend/connectors/` | Member 1 | 7 data source adapters |
| `backend/ingestion/store.py` | Member 1 | PostgreSQL ingestion store |
| `backend/app/api/bug_bounty.py` | Member 1 | Bug bounty portal APIs |
| `frontend/src/` | Member 6 | React dashboard — 20+ pages |
| `crispr_products/src/` | Member 6 | Lovable product shell |