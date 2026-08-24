import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  HelpCircle,
  RefreshCw,
  Download,
  Play,
  ChevronDown,
  ChevronRight,
  Loader2,
  Menu,
} from 'lucide-react';
import { openCommandPalette, useUiStore, setFilter, toggleMobileNav } from '../../lib/uiStore';
import { useDemoStore, runAnalysis } from '../../demo/demoStore';
import { toast } from '../../lib/toastStore';
import { BRAND } from '../../config/branding';

const TIME_RANGES: { id: any; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
];

const ENVIRONMENTS: { id: any; label: string }[] = [
  { id: 'all', label: 'All Environments' },
  { id: 'production', label: 'Production' },
  { id: 'staging', label: 'Staging' },
  { id: 'development', label: 'Development' },
];

const PAGE_LABELS: Record<string, string> = {
  security: 'Security Dashboard',
  financial: 'Financial Dashboard',
  findings: 'Findings',
  assets: 'Assets',
  risks: 'Risk Cases',
  'attack-paths': 'Attack Paths',
  resources: 'Resources',
  vulnerabilities: 'Vulnerabilities',
  secrets: 'Secrets',
  'threat-intelligence': 'Threat Intelligence',
  'cloud-security': 'Cloud Security',
  'identity-security': 'Identity Security',
  'code-security': 'Code Security',
  scenarios: 'Scenarios',
  recommendations: 'Recommendations',
  'remediation-queue': 'Remediation Queue',
  investments: 'Investment Optimizer',
  compliance: 'Compliance',
  policies: 'Policies',
  reports: 'Reports',
  integrations: 'Integrations',
  'api-reference': 'API',
  settings: 'Settings',
  demo: 'Developer Workspace',
  repositories: 'Repository',
  sca: 'SCA & SBOM',
};

function useBreadcrumb() {
  const location = useLocation();
  return useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const crumbs = segments
      .filter((s) => !/^[A-Za-z0-9_-]{6,}$/.test(s) || PAGE_LABELS[s]) // hide raw ids like repo ids
      .map((s) => PAGE_LABELS[s] ?? s.replace(/-/g, ' '));
    return crumbs.length ? crumbs : ['Security Dashboard'];
  }, [location.pathname]);
}

const NOTIFICATIONS = [
  {
    title: 'New CRITICAL finding',
    body: 'Authentication API — auth bypass validated by HackerOne',
    color: 'var(--color-critical)',
    path: '/findings?severity=CRITICAL',
    unread: true,
  },
  {
    title: 'Integration warning',
    body: 'Jira sync completed with 1 error',
    color: 'var(--color-warning)',
    path: '/integrations',
    unread: true,
  },
  {
    title: 'Report ready',
    body: 'Q3 2026 Board Risk Report has been generated',
    color: 'var(--color-primary-blue)',
    path: '/reports',
    unread: false,
  },
];

export default function TopBar() {
  const navigate = useNavigate();
  const filters = useUiStore((s) => s.filters);
  const isRunning = useDemoStore((s) => s.isRunning);
  const progressPct = useDemoStore((s) => s.progressPct);
  const [envOpen, setEnvOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const crumbs = useBreadcrumb();

  useEffect(() => {
    const main = document.querySelector('.app-main main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 2);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.info('Refreshing dashboard data…');
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Dashboard refreshed');
    }, 900);
  };

  const handleExport = () => {
    toast.success('Export started', 'crispr-security-report.pdf will download shortly.');
  };

  return (
    <header
      className={scrolled ? 'topbar-scrolled' : ''}
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        position: 'sticky',
        top: 0,
        zIndex: 15,
        gap: 16,
        transition: 'box-shadow var(--motion-base) var(--ease-standard)',
      }}
    >
      {/* Mobile nav toggle — hidden on desktop via CSS, shown under 768px */}
      <button className="icon-btn mobile-menu-btn" style={{ display: 'none' }} onClick={toggleMobileNav} aria-label="Toggle navigation menu">
        <Menu size={16} />
      </button>

      {/* Breadcrumbs */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <strong>{BRAND.name}</strong>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={13} className="sep" />
            <span style={{ textTransform: 'capitalize' }}>{c}</span>
          </span>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Global search / command palette trigger */}
      <button
        onClick={openCommandPalette}
        className="topbar-search"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: '8px 14px',
          width: 340,
          maxWidth: '100%',
          cursor: 'text',
          textAlign: 'left',
          transition: 'background var(--motion-fast) var(--ease-standard), box-shadow var(--motion-fast) var(--ease-standard)',
        }}
        aria-label="Open command palette"
      >
        <Search size={15} color="var(--color-text-muted)" />
        <span className="topbar-search-placeholder" style={{ flex: 1, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
          Search assets, findings, CVEs, repositories...
        </span>
        <span className="kbd">Ctrl K</span>
      </button>

      {/* Environment selector */}
      <div className="topbar-env-select" style={{ position: 'relative' }}>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '7px 12px' }}
          onClick={() => setEnvOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={envOpen}
        >
          {ENVIRONMENTS.find((e) => e.id === filters.environment)?.label}
          <ChevronDown size={12} />
        </button>
        {envOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              minWidth: 180,
              zIndex: 30,
              boxShadow: 'var(--shadow-md)',
              padding: 4,
              animation: 'command-in var(--motion-fast) var(--ease-standard)',
            }}
            onMouseLeave={() => setEnvOpen(false)}
          >
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.id}
                className="command-result-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit', color: 'inherit' }}
                onClick={() => {
                  setFilter('environment', e.id);
                  setEnvOpen(false);
                }}
              >
                {e.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Time range selector */}
      <div className="topbar-range-select" style={{ position: 'relative' }}>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '7px 12px' }}
          onClick={() => setRangeOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={rangeOpen}
        >
          {TIME_RANGES.find((r) => r.id === filters.timeRange)?.label}
          <ChevronDown size={12} />
        </button>
        {rangeOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              minWidth: 140,
              zIndex: 30,
              boxShadow: 'var(--shadow-md)',
              padding: 4,
              animation: 'command-in var(--motion-fast) var(--ease-standard)',
            }}
            onMouseLeave={() => setRangeOpen(false)}
          >
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                className="command-result-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit', color: 'inherit' }}
                onClick={() => {
                  setFilter('timeRange', r.id);
                  setRangeOpen(false);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* System status */}
      <div
        className="tooltip-wrap topbar-status"
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}
        tabIndex={0}
      >
        <span className="status-live-dot" />
        <span>Operational</span>
        <span className="tooltip-bubble">13 of 13 connected sources reporting normally. Last health check 40s ago.</span>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--color-divider)' }} />

      {/* Refresh */}
      <button className="icon-btn" onClick={handleRefresh} aria-label="Refresh dashboard data" title="Refresh">
        <RefreshCw size={16} style={refreshing ? { animation: 'spin-refresh 0.8s linear infinite' } : undefined} />
      </button>

      {/* Export */}
      <button className="icon-btn" onClick={handleExport} aria-label="Export report" title="Export">
        <Download size={16} />
      </button>

      {/* Run Analysis */}
      <button
        className="btn-primary run-analysis-btn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 132, justifyContent: 'center' }}
        onClick={() => runAnalysis()}
        disabled={isRunning}
        aria-label="Run Analysis"
      >
        {isRunning ? (
          <>
            <Loader2 size={14} style={{ animation: 'spin-refresh 0.8s linear infinite' }} />
            <span className="run-analysis-label">{progressPct}%</span>
          </>
        ) : (
          <>
            <Play size={14} /> <span className="run-analysis-label">Run Analysis</span>
          </>
        )}
      </button>

      {/* Help */}
      <button className="icon-btn" aria-label="Help" title="Help" onClick={() => toast.info('CRISPR Docs', 'Documentation portal would open in a new tab.')}>
        <HelpCircle size={17} />
      </button>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button className="icon-btn" style={{ position: 'relative' }} aria-label="Notifications" onClick={() => setNotifOpen((v) => !v)}>
          <Bell size={17} />
          {NOTIFICATIONS.some((n) => n.unread) && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--color-critical)',
                border: '1.5px solid #fff',
              }}
            />
          )}
        </button>
        {notifOpen && (
          <div className="notif-panel" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30, animation: 'command-in var(--motion-fast) var(--ease-standard)' }} onMouseLeave={() => setNotifOpen(false)}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-divider)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Notifications
            </div>
            {NOTIFICATIONS.map((n) => (
              <button
                key={n.title}
                className={`notif-item${n.unread ? ' unread' : ''}`}
                onClick={() => {
                  setNotifOpen(false);
                  navigate(n.path);
                }}
              >
                <span className="notif-dot" style={{ background: n.color }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{n.body}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Profile */}
      <div style={{ position: 'relative' }}>
        <button className="avatar-circle" onClick={() => setProfileOpen((v) => !v)} aria-label="User menu">
          NP
        </button>
        {profileOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              width: 220,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              zIndex: 30,
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              animation: 'command-in var(--motion-fast) var(--ease-standard)',
            }}
            onMouseLeave={() => setProfileOpen(false)}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Neha Patel</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>CISO · NovaPay</div>
            </div>
            <button
              className="command-result-row"
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit', color: 'inherit', borderRadius: 0 }}
              onClick={() => {
                setProfileOpen(false);
                navigate('/settings');
              }}
            >
              Settings
            </button>
            <button
              className="command-result-row"
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit', color: 'inherit', borderRadius: 0 }}
              onClick={() => {
                setProfileOpen(false);
                navigate('/integrations');
              }}
            >
              Integrations
            </button>
            <button
              className="command-result-row"
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', font: 'inherit', color: 'inherit', borderRadius: 0 }}
              onClick={() => {
                setProfileOpen(false);
                toast.info('Signed out (demo mode)');
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
