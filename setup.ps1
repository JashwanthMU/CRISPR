$initDirs = @(
    "backend",
    "backend/app",
    "backend/app/api",
    "backend/app/models",
    "backend/connectors",
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
    "backend/normalization",
    "backend/correlation",
    "backend/asset_intelligence",
    "backend/controls",
    "backend/risk_engine",
    "backend/financial_engine",
    "backend/scenario_engine",
    "backend/optimizer",
    "backend/compliance",
    "ml",
    "ml/incident_prediction",
    "ml/anomaly_detection",
    "ml/forecasting",
    "ml/explainability",
    "ai",
    "ai/assistant",
    "ai/tools",
    "ai/knowledge"
)

foreach ($dir in $initDirs) {
    $init = Join-Path $dir "__init__.py"
    if (-not (Test-Path $init)) {
        New-Item -ItemType File -Path $init -Force | Out-Null
        Write-Host "Created $init"
    }
}
Write-Host "Done - all __init__.py files created"