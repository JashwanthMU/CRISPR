import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  IndianRupee,
  Search,
  Building2,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Waypoints,
  Boxes,
  Bug,
  KeyRound,
  Radar,
  Cloud,
  UserCog,
  Code2,
  ListChecks,
  Inbox,
  FileText,
  ScrollText,
  Plug,
  Terminal as TerminalIcon,
  Settings,
  FileCode2,
} from 'lucide-react';
import { useUiStore, toggleSidebar, closeMobileNav } from '../../lib/uiStore';
import { toast } from '../../lib/toastStore';
import Logo from '../common/Logo';
import { BRAND } from '../../config/branding';

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Security Dashboard', to: '/security', icon: <ShieldCheck size={17} strokeWidth={1.8} /> },
      { label: 'Financial Dashboard', to: '/financial', icon: <IndianRupee size={17} strokeWidth={1.8} /> },
    ],
  },
  {
    title: 'Investigate',
    items: [
      { label: 'Findings', to: '/findings', icon: <Search size={17} strokeWidth={1.8} /> },
      { label: 'Assets', to: '/assets', icon: <Building2 size={17} strokeWidth={1.8} /> },
      { label: 'Risk Cases', to: '/risks', icon: <AlertTriangle size={17} strokeWidth={1.8} /> },
      { label: 'Attack Paths', to: '/attack-paths', icon: <Waypoints size={17} strokeWidth={1.8} /> },
      { label: 'Resources', to: '/resources', icon: <Boxes size={17} strokeWidth={1.8} /> },
    ],
  },
  {
    title: 'Detect',
    items: [
      { label: 'Vulnerabilities', to: '/vulnerabilities', icon: <Bug size={17} strokeWidth={1.8} /> },
      { label: 'Secrets', to: '/secrets', icon: <KeyRound size={17} strokeWidth={1.8} /> },
      { label: 'Threat Intelligence', to: '/threat-intelligence', icon: <Radar size={17} strokeWidth={1.8} /> },
      { label: 'Cloud Security', to: '/cloud-security', icon: <Cloud size={17} strokeWidth={1.8} /> },
      { label: 'Identity Security', to: '/identity-security', icon: <UserCog size={17} strokeWidth={1.8} /> },
      { label: 'Code Security', to: '/code-security', icon: <Code2 size={17} strokeWidth={1.8} /> },
    ],
  },
  {
    title: 'Remediate',
    items: [
      { label: 'Scenarios', to: '/scenarios', icon: <RefreshCw size={17} strokeWidth={1.8} /> },
      { label: 'Recommendations', to: '/recommendations', icon: <ListChecks size={17} strokeWidth={1.8} /> },
      { label: 'Remediation Queue', to: '/remediation-queue', icon: <Inbox size={17} strokeWidth={1.8} /> },
      { label: 'Investment Optimizer', to: '/investments', icon: <Lightbulb size={17} strokeWidth={1.8} /> },
    ],
  },
  {
    title: 'Govern',
    items: [
      { label: 'Compliance', to: '/compliance', icon: <CheckCircle2 size={17} strokeWidth={1.8} /> },
      { label: 'Policies', to: '/policies', icon: <FileText size={17} strokeWidth={1.8} /> },
      { label: 'Reports', to: '/reports', icon: <ScrollText size={17} strokeWidth={1.8} /> },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Integrations', to: '/integrations', icon: <Plug size={17} strokeWidth={1.8} /> },
      { label: 'API', to: '/api-reference', icon: <TerminalIcon size={17} strokeWidth={1.8} /> },
      { label: 'Dev Workspace', to: '/demo/vscode', icon: <FileCode2 size={17} strokeWidth={1.8} /> },
      { label: 'Settings', to: '/settings', icon: <Settings size={17} strokeWidth={1.8} /> },
    ],
  },
];

export default function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);

  return (
    <>
      {mobileNavOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={closeMobileNav}
          style={{ position: 'fixed', inset: 0, background: 'var(--overlay-color)', zIndex: 19, display: 'none' }}
        />
      )}
      <aside
        className={`app-sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileNavOpen ? ' mobile-nav-open' : ''}`}
        style={{
          width: 240,
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
          transition: 'width var(--motion-base) var(--ease-standard)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: collapsed ? '20px 0' : '20px 20px 6px',
            justifyItems: 'center',
          }}
        >
          <div style={{ paddingLeft: collapsed ? 22 : 0 }}>
            <Logo size={collapsed ? 24 : 26} withWordmark={!collapsed} wordmarkSize={16} />
          </div>
        </div>
        {!collapsed && (
          <div style={{ padding: '0 20px 16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{BRAND.tagline}</span>
          </div>
        )}
        <div style={{ borderBottom: '1px solid var(--color-divider)' }} />

        {/* Organization selector */}
        <div
          className="nav-item-collapsed"
          role="button"
          aria-haspopup="listbox"
          onClick={() => toast.info('Single-organization workspace', `${BRAND.organization} is the only organization in this workspace.`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toast.info('Single-organization workspace', `${BRAND.organization} is the only organization in this workspace.`);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: 8,
            padding: collapsed ? '14px 0' : '12px 20px',
            borderBottom: '1px solid var(--color-divider)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background var(--motion-fast) var(--ease-standard)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          tabIndex={0}
        >
          {collapsed ? (
            <Building2 size={16} color="var(--color-text-secondary)" />
          ) : (
            <>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Organization</div>
                <div
                  className="org-selector-text"
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-primary)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={BRAND.organization}
                >
                  {BRAND.organization}
                </div>
              </div>
              <ChevronDown size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            </>
          )}
          {collapsed && <span className="nav-tooltip">{BRAND.organization}</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }} aria-label="Primary">
          {sections.map((section) => (
            <div key={section.title} style={{ marginBottom: 12 }}>
              {!collapsed && (
                <div
                  className="nav-section-title"
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                    padding: '8px 12px 6px',
                  }}
                >
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="nav-item-collapsed"
                  title={collapsed ? item.label : undefined}
                  onClick={closeMobileNav}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: 12,
                    padding: collapsed ? '10px 0' : '8px 12px',
                    marginBottom: 2,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--color-primary-blue)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-light-blue)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--color-primary-blue)' : '3px solid transparent',
                    marginLeft: isActive ? -3 : 0,
                    textDecoration: 'none',
                    transition: 'background var(--motion-fast) var(--ease-standard), color var(--motion-fast) var(--ease-standard)',
                    position: 'relative',
                  })}
                  onMouseEnter={(e) => {
                    if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                      e.currentTarget.style.background = 'var(--color-bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {item.icon}
                  <span className="nav-label">{item.label}</span>
                  {collapsed && <span className="nav-tooltip">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="icon-btn"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            margin: collapsed ? '0 auto 12px' : '0 14px 12px auto',
            display: 'flex',
            border: '1px solid var(--color-border)',
          }}
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>

        {/* Footer */}
        {!collapsed && (
          <div
            className="sidebar-footer-text"
            style={{
              padding: '12px 20px 18px',
              borderTop: '1px solid var(--color-divider)',
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <div style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>NovaPay FinSec</div>
            <div>v1.0 · Enterprise Preview</div>
          </div>
        )}
      </aside>
    </>
  );
}
