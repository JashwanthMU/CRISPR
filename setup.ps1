# CRISPR — Full Project Structure Setup
# Run once from repo root: .\setup.ps1

$dirs = @(
  # ── MEMBER 1: Connectors / Ingestion ──────────────────────────────
  "backend/connectors/bug_bounty",
  "backend/connectors/vulnerability_scanner",
  "backend/connectors/edr",
  "backend/connectors/xdr",
  "backend/connectors/siem",
  "backend/connectors/iam",
  "backend/connectors/cspm",
  "backend/connectors/threat_intel",
  "backend/connectors/cmdb",
  "backend/ingestion",
  "data/demo",
  "data/schemas",

  # ── MEMBER 2: Normalization / Correlation / Asset Graph ───────────
  "backend/normalization",
  "backend/correlation",
  "backend/asset_intelligence",
  "backend/controls",

  # ── MEMBER 3: Risk Engine / Financial Engine ──────────────────────
  "backend/risk_engine",
  "backend/financial_engine",

  # ── MEMBER 4: AI / ML ────────────────────────────────────────────
  "ml/incident_prediction",
  "ml/anomaly_detection",
  "ml/forecasting",
  "ml/explainability",
  "ai/assistant",
  "ai/tools",
  "ai/knowledge",

  # ── MEMBER 5: Scenarios / Optimizer / Compliance ──────────────────
  "backend/scenario_engine",
  "backend/optimizer",
  "backend/compliance",

  # ── MEMBER 6: Frontend ────────────────────────────────────────────
  "frontend/src/pages",
  "frontend/src/components",
  "frontend/src/services",
  "frontend/src/utils",
  "frontend/public",

  # ── SHARED ────────────────────────────────────────────────────────
  "backend/app/api",
  "backend/app/models",
  "backend/database/migrations",
  "docs/architecture",
  "docs/methodology",
  "infra"
)

foreach ($dir in $dirs) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $keep = Join-Path $dir ".gitkeep"
  if (-not (Test-Path $keep)) { New-Item -ItemType File -Path $keep | Out-Null }
}

Write-Host "CRISPR project structure created — $($dirs.Count) directories"