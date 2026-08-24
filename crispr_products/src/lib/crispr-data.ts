/**
 * CRISPR demo dataset + deterministic "engine" outputs.
 * All figures are simulated demo data for prototype/judging purposes.
 */

export const SOURCES = [
  { id: "bugbounty", name: "Bug Bounty", icon: "shield", findings: 24, critical: 7, validated: 3, correlated: 2, volume: 62 },
  { id: "scanner", name: "Scanner (VA/DAST)", icon: "scan", findings: 186, critical: 12, validated: 9, correlated: 5, volume: 94 },
  { id: "edr", name: "EDR / XDR", icon: "monitor", findings: 48, critical: 4, validated: 12, correlated: 4, volume: 48 },
  { id: "siem", name: "SIEM", icon: "activity", findings: 412, critical: 9, validated: 21, correlated: 6, volume: 100 },
  { id: "iam", name: "IAM", icon: "key", findings: 31, critical: 3, validated: 4, correlated: 3, volume: 26 },
  { id: "cspm", name: "CSPM", icon: "cloud", findings: 97, critical: 6, validated: 5, correlated: 2, volume: 58 },
  { id: "ti", name: "Threat Intel", icon: "radar", findings: 19, critical: 5, validated: 5, correlated: 4, volume: 30 },
  { id: "cmdb", name: "CMDB", icon: "server", findings: 0, critical: 0, validated: 0, correlated: 0, volume: 14 },
] as const;

export const PIPELINE_STAGES = [
  { id: "ingest", name: "Ingestion Engine", detail: "Connector normalisation, dedupe, 817 raw events/min" },
  { id: "normalize", name: "Normalization", detail: "Unified finding schema, CVE + CWE + MITRE enrichment" },
  { id: "correlate", name: "Correlation", detail: "Entity resolution across sources, confidence scoring" },
  { id: "graph", name: "Business Graph", detail: "Asset → service → revenue dependency mapping" },
  { id: "risk", name: "Risk Engine", detail: "Likelihood × impact, Monte Carlo loss distribution" },
] as const;

export const RISK_CASE = {
  id: "RC-001",
  title: "Payment Authentication Compromise",
  service: "Digital Payments",
  sources: 5,
  confidence: 94,
  criticality: 96,
  threatActivity: "HIGH",
  score: 87,
  likelihood: 21,
  ealLakh: 79.8,
  contributors: [
    { label: "Internet exposure", value: 20 },
    { label: "Critical business service", value: 18 },
    { label: "Bug bounty validation", value: 17 },
    { label: "XDR evidence", value: 14 },
    { label: "Weak MFA coverage", value: 12 },
    { label: "Threat intelligence match", value: 10 },
    { label: "Existing EDR coverage", value: -8 },
    { label: "WAF protection", value: -6 },
  ],
  mergedFindings: [
    { source: "Bug Bounty", title: "Auth bypass via token replay", severity: "Critical" },
    { source: "Scanner", title: "CVE-2024-21893 on auth gateway", severity: "High" },
    { source: "EDR / XDR", title: "Suspicious admin login chain", severity: "High" },
    { source: "IAM", title: "MFA not enforced for 42 privileged users", severity: "High" },
    { source: "Threat Intel", title: "Active exploitation in BFSI sector", severity: "Critical" },
  ],
} as const;

export const IMPACT_BREAKDOWN = [
  { label: "Downtime", crore: 1.4 },
  { label: "Data loss", crore: 0.8 },
  { label: "Recovery", crore: 0.35 },
  { label: "Incident response", crore: 0.42 },
  { label: "Regulatory penalty", crore: 0.38 },
  { label: "Customer impact", crore: 0.29 },
  { label: "Reputation", crore: 0.16 },
] as const;

export const TOTAL_IMPACT_CRORE = 3.8;

export const LOSS_PERCENTILES = [
  { label: "P50", value: "₹65 L", pct: 36 },
  { label: "P90", value: "₹1.4 Cr", pct: 74 },
  { label: "P95", value: "₹1.8 Cr", pct: 95 },
] as const;

export const ASSET_GRAPH = {
  nodes: [
    { id: "internet", label: "Internet", kind: "edge", x: 50, y: 6 },
    { id: "waf", label: "WAF", kind: "control", x: 78, y: 30 },
    { id: "payment", label: "Payment API", kind: "service", x: 50, y: 30 },
    { id: "auth", label: "Authentication", kind: "service", x: 24, y: 52 },
    { id: "userdb", label: "User DB", kind: "data", x: 50, y: 68 },
    { id: "core", label: "Core Banking", kind: "data", x: 50, y: 90 },
  ],
  edges: [
    ["internet", "payment"],
    ["payment", "waf"],
    ["payment", "auth"],
    ["auth", "userdb"],
    ["userdb", "core"],
  ],
} as const;

export const ASSET_CONTEXT: Record<
  string,
  { service: string; criticality: number; revenue: string; sensitivity: string; internet: string; regulated: string }
> = {
  payment: { service: "Digital Payments", criticality: 96, revenue: "₹5 L / hour", sensitivity: "HIGH", internet: "YES", regulated: "YES" },
  auth: { service: "Identity & Access", criticality: 91, revenue: "₹5 L / hour", sensitivity: "HIGH", internet: "NO", regulated: "YES" },
  userdb: { service: "Customer Data Store", criticality: 88, revenue: "Indirect", sensitivity: "CRITICAL", internet: "NO", regulated: "YES" },
  core: { service: "Core Banking", criticality: 99, revenue: "₹12 L / hour", sensitivity: "CRITICAL", internet: "NO", regulated: "YES" },
  waf: { service: "Perimeter Control", criticality: 62, revenue: "Indirect", sensitivity: "LOW", internet: "YES", regulated: "NO" },
  internet: { service: "Untrusted Zone", criticality: 0, revenue: "—", sensitivity: "—", internet: "YES", regulated: "NO" },
};

export const RECOMMENDATIONS = [
  { id: "mfa", name: "Enable privileged MFA", costLakh: 4.5, projectedEalLakh: 31.2, rosi: 9.8, scoreAfter: 54 },
  { id: "patch", name: "Patch authentication vulnerability", costLakh: 2.1, projectedEalLakh: 44.6, rosi: 16.8, scoreAfter: 63 },
  { id: "api", name: "Tighten API access controls", costLakh: 6.8, projectedEalLakh: 52.4, rosi: 4.0, scoreAfter: 68 },
  { id: "segment", name: "Improve network segmentation", costLakh: 11.5, projectedEalLakh: 58.1, rosi: 1.9, scoreAfter: 71 },
] as const;

export const BUDGET_CONTROLS = [
  { id: "mfa", name: "Privileged MFA", costLakh: 15, reductionCrore: 1.6 },
  { id: "patch", name: "Critical patching programme", costLakh: 12, reductionCrore: 1.1 },
  { id: "segment", name: "Network segmentation", costLakh: 30, reductionCrore: 0.9 },
  { id: "edr", name: "EDR expansion", costLakh: 20, reductionCrore: 0.5 },
  { id: "cloud", name: "Cloud hardening", costLakh: 18, reductionCrore: 0.2 },
  { id: "backup", name: "Immutable backups", costLakh: 10, reductionCrore: 0.12 },
] as const;

export const PORTFOLIO_EAL_CRORE = 8.4;

export const FRAMEWORKS = [
  { id: "rbi", name: "RBI Cyber Security Framework", coverage: 78 },
  { id: "sebi", name: "SEBI CSCRF", coverage: 71 },
  { id: "certin", name: "CERT-In Directions", coverage: 91 },
  { id: "iso", name: "ISO 27001:2022", coverage: 84 },
  { id: "nist", name: "NIST CSF 2.0", coverage: 88 },
  { id: "cis", name: "CIS Controls v8", coverage: 76 },
] as const;

export const CONTROL_GAPS = ["Multi-factor authentication", "Privileged access control", "Continuous monitoring"] as const;

export const ADVISOR_QA = [
  {
    q: "What is our biggest financial cyber risk?",
    a: "Payment API authentication compromise (RC-001). Expected Annual Loss ₹79.8 lakh. Primary drivers: validated authentication bypass, internet exposure, weak privileged MFA and suspicious authentication activity observed in XDR.",
    cites: ["RC-001", "Risk engine v1.4", "5 correlated sources"],
  },
  {
    q: "What happens if I enable MFA?",
    a: "EAL decreases from ₹79.8 L to ₹31.2 L — approximately ₹48.6 L annualized risk reduction for ₹4.5 L implementation cost (ROSI 9.8×). Risk score moves 87 → 54.",
    cites: ["Scenario engine", "Control library: MFA"],
  },
  {
    q: "Where should we spend a ₹1 crore budget?",
    a: "Optimal portfolio: privileged MFA, critical patching, segmentation, EDR expansion and cloud hardening. Spend ₹95 L, residual portfolio EAL ₹4.1 Cr, risk reduction ₹4.3 Cr.",
    cites: ["Budget optimizer", "6 candidate controls"],
  },
  {
    q: "Are we compliant with RBI requirements?",
    a: "RBI coverage is 78% (simulated demo data). Open control gaps mapped to RC-001: MFA enforcement, privileged access control and continuous monitoring.",
    cites: ["India compliance map", "Demo dataset"],
  },
] as const;

export const NAV_DEMO = [
  { to: "/", label: "Problem" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/architecture", label: "Architecture" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/correlation", label: "Correlation" },
  { to: "/assets", label: "Business graph" },
  { to: "/financial", label: "Financial" },
  { to: "/drivers", label: "Why?" },
  { to: "/recommendations", label: "Recommend" },
  { to: "/scenarios", label: "What-if" },
  { to: "/budget", label: "Budget" },
  { to: "/compliance", label: "India" },
  { to: "/advisor", label: "AI advisor" },
] as const;

export const NAV_APP = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/correlation", label: "Risk cases" },
  { to: "/assets", label: "Assets" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/budget", label: "Investments" },
  { to: "/compliance", label: "Compliance" },
] as const;
