// ============================================================================
// Central API abstraction.
// ----------------------------------------------------------------------------
// Every page/component should import from here, never call axios/fetch
// directly. In demo mode (default — see API_MODE in client.ts) every
// function resolves fixture data after a small simulated delay. In live
// mode, it calls the real backend and — consistent with the rest of this
// app's "never crash the UI on a missing backend" philosophy — falls back
// to the same fixtures if the request fails or the endpoint isn't
// implemented yet.
//
// Components never need to know which mode is active: they always get back
// the same shape (see src/types).
// ============================================================================

import { httpClient, API_MODE, simulateLatency } from './client';
import type {
  Asset,
  Finding,
  RiskCase,
  Repository,
  Integration,
  Project,
  Vulnerability,
} from '../../types';
import {
  MOCK_ASSETS,
  MOCK_FINDINGS,
  MOCK_RISKS,
  MOCK_ENTERPRISE,
  MOCK_SOURCES,
  MOCK_COMPLIANCE,
} from '../../utils/mock';
import { REPOSITORIES, INTEGRATIONS, SCA_FINDINGS } from '../../demo/fixtures';
import { runAnalysis as runDemoAnalysis } from '../../demo/demoStore';

async function liveOrFallback<T>(path: string, fallback: T, method: 'get' | 'post' = 'get', body?: unknown): Promise<T> {
  if (API_MODE === 'demo') return simulateLatency(fallback);
  try {
    const res = method === 'get' ? await httpClient.get(path) : await httpClient.post(path, body);
    return (res?.data as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// ----------------------------------------------------------------------------
// Dashboard / enterprise
// ----------------------------------------------------------------------------
export function getDashboard() {
  return liveOrFallback('/api/risks/enterprise', MOCK_ENTERPRISE);
}

/** Alias for getDashboard — enterprise-level risk score & financial exposure summary. */
export const getEnterprise = getDashboard;

export function getProjects(): Promise<Project[]> {
  return liveOrFallback('/api/projects', [
    { id: 'proj-novapay', name: 'NovaPay Financial Services', organization: 'NovaPay', environment: 'production' },
  ]);
}

// ----------------------------------------------------------------------------
// Findings
// ----------------------------------------------------------------------------
export function getFindings(): Promise<Finding[]> {
  return liveOrFallback('/api/findings', MOCK_FINDINGS as unknown as Finding[]);
}

export function getFinding(id: string): Promise<Finding | undefined> {
  return liveOrFallback(`/api/findings/${id}`, (MOCK_FINDINGS as unknown as Finding[]).find((f) => f.finding_id === id));
}

export function getSources() {
  return liveOrFallback('/api/findings/sources', MOCK_SOURCES);
}

// ----------------------------------------------------------------------------
// Assets
// ----------------------------------------------------------------------------
export function getAssets(): Promise<Asset[]> {
  return liveOrFallback('/api/assets', MOCK_ASSETS as unknown as Asset[]);
}

export function getAsset(id: string): Promise<Asset | undefined> {
  return liveOrFallback(`/api/assets/${id}`, (MOCK_ASSETS as unknown as Asset[]).find((a) => a.asset_id === id));
}

// ----------------------------------------------------------------------------
// Risk cases
// ----------------------------------------------------------------------------
export function getRiskCases(): Promise<RiskCase[]> {
  return liveOrFallback('/api/risks', MOCK_RISKS as unknown as RiskCase[]);
}

export function getRiskCase(id: string): Promise<RiskCase | undefined> {
  return liveOrFallback(`/api/risks/${id}`, (MOCK_RISKS as unknown as RiskCase[]).find((r) => r.asset_id === id));
}

// ----------------------------------------------------------------------------
// Repositories / Code Security
// ----------------------------------------------------------------------------
export function getRepositories(): Promise<Repository[]> {
  return liveOrFallback('/api/repositories', REPOSITORIES);
}

export function getRepository(id: string): Promise<Repository | undefined> {
  return liveOrFallback(`/api/repositories/${id}`, REPOSITORIES.find((r) => r.id === id));
}

export function getScaFindings(repositoryName?: string) {
  const all = SCA_FINDINGS;
  const filtered = repositoryName ? all.filter((f) => f.repository === repositoryName) : all;
  return liveOrFallback(`/api/sca?repo=${repositoryName ?? ''}`, filtered);
}

// ----------------------------------------------------------------------------
// Integrations
// ----------------------------------------------------------------------------
export function getIntegrations(): Promise<Integration[]> {
  return liveOrFallback('/api/integrations', INTEGRATIONS);
}

// ----------------------------------------------------------------------------
// Compliance / reports
// ----------------------------------------------------------------------------
export function getReports() {
  return liveOrFallback('/api/reports', [
    { id: 'rep-1', name: 'Q3 2026 Board Risk Report', generated: '2026-08-01', format: 'PDF' },
    { id: 'rep-2', name: 'RBI CSF Compliance Summary', generated: '2026-07-15', format: 'PDF' },
    { id: 'rep-3', name: 'Weekly Findings Digest', generated: '2026-08-22', format: 'CSV' },
  ]);
}

export function getCompliance() {
  return liveOrFallback('/api/compliance', MOCK_COMPLIANCE);
}

// ----------------------------------------------------------------------------
// Vulnerabilities (generic view distinct from SCA-specific findings)
// ----------------------------------------------------------------------------
export function getVulnerabilities(): Promise<Vulnerability[]> {
  const derived: Vulnerability[] = (MOCK_FINDINGS as unknown as Finding[])
    .filter((f) => f.cve)
    .map((f) => ({
      id: f.finding_id,
      cve: f.cve!,
      severity: f.severity,
      cvss: f.severity === 'CRITICAL' ? 9.6 : f.severity === 'HIGH' ? 7.8 : 5.4,
      component: f.asset_id,
      affectedAssets: [f.asset_id],
      exploitAvailable: f.finding_type === 'ACTIVE_EXPLOITATION' || f.status === 'VALIDATED',
      patchAvailable: true,
      status: f.status,
    }));
  return liveOrFallback('/api/vulnerabilities', derived);
}

// ----------------------------------------------------------------------------
// Analysis trigger — delegates to the deterministic demo engine in demo mode.
// ----------------------------------------------------------------------------
export async function runAnalysis(): Promise<{ started: boolean }> {
  if (API_MODE === 'demo') {
    await runDemoAnalysis();
    return { started: true };
  }
  try {
    await httpClient.post('/api/analysis/run');
    return { started: true };
  } catch {
    // Even in live mode, still drive the visual demo engine so the UI isn't dead.
    await runDemoAnalysis();
    return { started: true };
  }
}
