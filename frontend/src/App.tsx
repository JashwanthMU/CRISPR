import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/shell/AppShell';
import ToastHost from './components/common/ToastHost';
import CommandPalette from './components/common/CommandPalette';
import { openCommandPalette, closeCommandPalette, useUiStore } from './lib/uiStore';

import Login from './pages/Login';
import { getSession } from './lib/auth';
import { API_MODE } from './lib/api';
import { getEffectiveWorkspace, getWorkspaceHome, SIH_WORKSPACE_ENABLED, type Workspace } from './lib/workspace';

const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'));
const FinancialDashboard = lazy(() => import('./pages/FinancialDashboard'));
const Findings = lazy(() => import('./pages/Findings'));
const Assets = lazy(() => import('./pages/Assets'));
const Risks = lazy(() => import('./pages/Risks'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const Investments = lazy(() => import('./pages/Investments'));
const Compliance = lazy(() => import('./pages/Compliance'));
const AttackPaths = lazy(() => import('./pages/AttackPaths'));
const Resources = lazy(() => import('./pages/Resources'));
const Vulnerabilities = lazy(() => import('./pages/Vulnerabilities'));
const Secrets = lazy(() => import('./pages/Secrets'));
const ThreatIntelligence = lazy(() => import('./pages/ThreatIntelligence'));
const CloudSecurity = lazy(() => import('./pages/CloudSecurity'));
const IdentitySecurity = lazy(() => import('./pages/IdentitySecurity'));
const CodeSecurity = lazy(() => import('./pages/CodeSecurity'));
const RepositoryDetail = lazy(() => import('./pages/RepositoryDetail'));
const ScaSbom = lazy(() => import('./pages/ScaSbom'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const RemediationQueue = lazy(() => import('./pages/RemediationQueue'));
const Policies = lazy(() => import('./pages/Policies'));
const Reports = lazy(() => import('./pages/Reports'));
const Integrations = lazy(() => import('./pages/Integrations'));
const ApiReference = lazy(() => import('./pages/ApiReference'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const VSCodeDemo = lazy(() => import('./pages/VSCodeDemo'));

function DemoOnly({ children, feature }: { children: ReactNode; feature: string }) {
  if (API_MODE === 'demo') return <>{children}</>;
  return (
    <div className="page-container">
      <div className="card empty-state">
        {feature} is unavailable in live mode until a verified live-data connector is configured.
      </div>
    </div>
  );
}

function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const isOpen = useUiStore.getState().commandPaletteOpen;
        isOpen ? closeCommandPalette() : openCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

function Shell() {
  useGlobalShortcuts();
  // The authenticated workspace claim overrides the browser's login-page selection.
  const workspace = getEffectiveWorkspace();
  const home = getWorkspaceHome(workspace);

  const workspacePage = (allowed: Workspace, page: ReactNode) => (
    !SIH_WORKSPACE_ENABLED || workspace === allowed ? <>{page}</> : <Navigate to={home} replace />
  );

  return (
    <>
      <AppShell>
        <Suspense fallback={<div className="page-container"><div className="card empty-state">Loading workspace…</div></div>}>
          <Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/executive" element={workspacePage('executive', <FinancialDashboard />)} />
          <Route path="/security" element={workspacePage('technical', <SecurityDashboard />)} />
          <Route path="/financial" element={workspacePage('executive', <FinancialDashboard />)} />

          <Route path="/findings" element={workspacePage('technical', <Findings />)} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/attack-paths" element={<AttackPaths />} />
          <Route path="/resources" element={workspacePage('executive', <Resources />)} />

          <Route path="/vulnerabilities" element={workspacePage('technical', <Vulnerabilities />)} />
          <Route path="/secrets" element={workspacePage('technical', <Secrets />)} />
          <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
          <Route path="/cloud-security" element={workspacePage('technical', <CloudSecurity />)} />
          <Route path="/identity-security" element={workspacePage('technical', <IdentitySecurity />)} />
          <Route path="/code-security" element={workspacePage('technical', <CodeSecurity />)} />
          <Route path="/code-security/repositories/:id" element={workspacePage('technical', <RepositoryDetail />)} />
          <Route path="/code-security/sca" element={workspacePage('technical', <ScaSbom />)} />

          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/recommendations" element={workspacePage('executive', <Recommendations />)} />
          <Route path="/remediation-queue" element={<RemediationQueue />} />
          <Route path="/investments" element={workspacePage('executive', <Investments />)} />

          <Route path="/compliance" element={<Compliance />} />
          <Route path="/policies" element={workspacePage('technical', <Policies />)} />
          <Route path="/reports" element={<Reports />} />

          <Route path="/integrations" element={workspacePage('technical', <Integrations />)} />
          <Route path="/api-reference" element={workspacePage('technical', <ApiReference />)} />
          <Route path="/settings" element={workspacePage('technical', <SettingsPage />)} />

          <Route path="/demo/vscode" element={workspacePage('technical', <DemoOnly feature="VS Code demonstration"><VSCodeDemo /></DemoOnly>)} />

          <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <ToastHost />
      <CommandPalette />
    </>
  );
}

function ProtectedShell() {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(() => getSession()?.user.role === 'SECURITY');

  useEffect(() => {
    const update = () => setAuthenticated(getSession()?.user.role === 'SECURITY');
    window.addEventListener('crispr:auth-changed', update);
    return () => window.removeEventListener('crispr:auth-changed', update);
  }, []);

  if (!authenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Shell />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedShell />} />
      </Routes>
    </BrowserRouter>
  );
}
