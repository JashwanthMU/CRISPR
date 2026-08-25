import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/shell/AppShell';
import ToastHost from './components/common/ToastHost';
import CommandPalette from './components/common/CommandPalette';
import { openCommandPalette, closeCommandPalette, useUiStore } from './lib/uiStore';

import SecurityDashboard from './pages/SecurityDashboard';
import FinancialDashboard from './pages/FinancialDashboard';
import Findings from './pages/Findings';
import Assets from './pages/Assets';
import Risks from './pages/Risks';
import Scenarios from './pages/Scenarios';
import Investments from './pages/Investments';
import Compliance from './pages/Compliance';

import AttackPaths from './pages/AttackPaths';
import Resources from './pages/Resources';
import Vulnerabilities from './pages/Vulnerabilities';
import Secrets from './pages/Secrets';
import ThreatIntelligence from './pages/ThreatIntelligence';
import CloudSecurity from './pages/CloudSecurity';
import IdentitySecurity from './pages/IdentitySecurity';
import CodeSecurity from './pages/CodeSecurity';
import RepositoryDetail from './pages/RepositoryDetail';
import ScaSbom from './pages/ScaSbom';
import Recommendations from './pages/Recommendations';
import RemediationQueue from './pages/RemediationQueue';
import Policies from './pages/Policies';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import ApiReference from './pages/ApiReference';
import SettingsPage from './pages/Settings';
import VSCodeDemo from './pages/VSCodeDemo';
import Login from './pages/Login';
import { getSession } from './lib/auth';

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

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/security" replace />} />
          <Route path="/security" element={<SecurityDashboard />} />
          <Route path="/financial" element={<FinancialDashboard />} />

          <Route path="/findings" element={<Findings />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/attack-paths" element={<AttackPaths />} />
          <Route path="/resources" element={<Resources />} />

          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/secrets" element={<Secrets />} />
          <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
          <Route path="/cloud-security" element={<CloudSecurity />} />
          <Route path="/identity-security" element={<IdentitySecurity />} />
          <Route path="/code-security" element={<CodeSecurity />} />
          <Route path="/code-security/repositories/:id" element={<RepositoryDetail />} />
          <Route path="/code-security/sca" element={<ScaSbom />} />

          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/remediation-queue" element={<RemediationQueue />} />
          <Route path="/investments" element={<Investments />} />

          <Route path="/compliance" element={<Compliance />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/reports" element={<Reports />} />

          <Route path="/integrations" element={<Integrations />} />
          <Route path="/api-reference" element={<ApiReference />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/demo/vscode" element={<VSCodeDemo />} />

          <Route path="*" element={<Navigate to="/security" replace />} />
        </Routes>
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

  return authenticated ? <Shell /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
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
