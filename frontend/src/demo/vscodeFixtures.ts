// ============================================================================
// Fixture file tree + file contents for the VS Code-style demo experience
// (src/pages/VSCodeDemo.tsx). Maps 1:1 onto the pipeline stage IDs in
// src/demo/fixtures.ts (INITIAL_PIPELINE) so "Run Analysis" can deterministically
// activate the matching file for each stage.
// ============================================================================

export interface DemoFileNode {
  path: string; // full path, used as a stable id
  name: string;
  type: 'file' | 'folder';
  children?: DemoFileNode[];
  language?: string;
  /** pipeline stage id that "activates" (opens + highlights) this file during a run */
  stageId?: string;
}

export const FILE_TREE: DemoFileNode[] = [
  {
    path: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        path: 'src/api',
        name: 'api',
        type: 'folder',
        children: [{ path: 'src/api/routes.py', name: 'routes.py', type: 'file', language: 'python', stageId: 'sources' }],
      },
      {
        path: 'src/core',
        name: 'core',
        type: 'folder',
        children: [{ path: 'src/core/config.py', name: 'config.py', type: 'file', language: 'python' }],
      },
      {
        path: 'src/ingestion',
        name: 'ingestion',
        type: 'folder',
        children: [{ path: 'src/ingestion/pipeline.py', name: 'pipeline.py', type: 'file', language: 'python', stageId: 'ingestion' }],
      },
      {
        path: 'src/correlation',
        name: 'correlation',
        type: 'folder',
        children: [{ path: 'src/correlation/engine.py', name: 'engine.py', type: 'file', language: 'python', stageId: 'correlation' }],
      },
      {
        path: 'src/risk',
        name: 'risk',
        type: 'folder',
        children: [{ path: 'src/risk/scoring.py', name: 'scoring.py', type: 'file', language: 'python', stageId: 'risk-engine' }],
      },
      {
        path: 'src/reports',
        name: 'reports',
        type: 'folder',
        children: [{ path: 'src/reports/generator.py', name: 'generator.py', type: 'file', language: 'python', stageId: 'ai-analysis' }],
      },
    ],
  },
];

export const FILE_CONTENTS: Record<string, string> = {
  'src/api/routes.py': `from fastapi import APIRouter
from src.core.config import settings

router = APIRouter(prefix="/api")

@router.get("/risks")
def list_risks():
    """Return all correlated risk cases for the current organization."""
    return risk_service.get_all(org_id=settings.ORG_ID)

@router.post("/analysis/run")
def run_analysis():
    """Trigger a full ingestion -> correlation -> risk-scoring pass."""
    return pipeline.run()
`,
  'src/core/config.py': `from pydantic import BaseSettings

class Settings(BaseSettings):
    ORG_ID: str = "novapay"
    ENV: str = "production"
    RISK_ENGINE_VERSION: str = "2.4.0"

settings = Settings()
`,
  'src/ingestion/pipeline.py': `import logging
from src.ingestion.sources import connected_sources

log = logging.getLogger("crispr.ingestion")

def run():
    log.info("Ingestion started")
    events = []
    for source in connected_sources():
        events.extend(source.fetch())
    log.info(f"Ingestion completed — {len(events)} raw events normalized")
    return events
`,
  'src/correlation/engine.py': `from collections import defaultdict

def correlate(findings):
    """Group findings that share an asset and elevate confidence when
    multiple independent sources agree on the same risk."""
    by_asset = defaultdict(list)
    for f in findings:
        by_asset[f.asset_id].append(f)

    relationships = 0
    for asset_id, group in by_asset.items():
        if len(group) > 1:
            relationships += len(group) - 1
    return relationships
`,
  'src/risk/scoring.py': `def calculate_risk_score(asset, findings, controls):
    """
    risk_score = f(business_criticality, likelihood, control_effectiveness)
    """
    base = asset.business_criticality * 0.4
    exposure = 20 if asset.internet_facing else 0
    findings_weight = sum(f.severity_weight for f in findings)
    control_offset = controls.effectiveness_pct * 0.3

    score = base + exposure + findings_weight - control_offset
    return max(0, min(100, round(score)))
`,
  'src/reports/generator.py': `from datetime import date

def generate_report(risk_cases):
    filename = f"crispr-risk-report-{date.today()}.pdf"
    # Renders EAL, top risk drivers, and recommended actions into a
    # board-ready PDF using the current risk_cases snapshot.
    return filename
`,
};

export function findNode(path: string, nodes: DemoFileNode[] = FILE_TREE): DemoFileNode | undefined {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) {
      const found = findNode(path, n.children);
      if (found) return found;
    }
  }
  return undefined;
}

export function stageFile(stageId: string): DemoFileNode | undefined {
  function walk(nodes: DemoFileNode[]): DemoFileNode | undefined {
    for (const n of nodes) {
      if (n.stageId === stageId) return n;
      if (n.children) {
        const found = walk(n.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  return walk(FILE_TREE);
}
