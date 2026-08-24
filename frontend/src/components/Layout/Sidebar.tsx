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
} from 'lucide-react';

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
      { label: 'Security Dashboard', to: '/security', icon: <ShieldCheck size={16} /> },
      { label: 'Financial Dashboard', to: '/financial', icon: <IndianRupee size={16} /> },
    ],
  },
  {
    title: 'Investigate',
    items: [
      { label: 'Findings', to: '/findings', icon: <Search size={16} /> },
      { label: 'Assets', to: '/assets', icon: <Building2 size={16} /> },
      { label: 'Risk Cases', to: '/risks', icon: <AlertTriangle size={16} /> },
    ],
  },
  {
    title: 'Remediate',
    items: [
      { label: 'Scenarios', to: '/scenarios', icon: <RefreshCw size={16} /> },
      { label: 'Investment Optimizer', to: '/investments', icon: <Lightbulb size={16} /> },
      { label: 'Compliance', to: '/compliance', icon: <CheckCircle2 size={16} /> },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--bg-border)',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--bg-border)',
        }}
      >
        <ShieldCheck size={22} color="var(--accent-blue)" />
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          CRISPR
          <span style={{ color: 'var(--accent-blue)' }}>.</span>
        </span>
      </div>

      {/* Company selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '14px 20px',
          borderBottom: '1px solid var(--bg-border)',
          cursor: 'pointer',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organization</div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title="NovaPay Financial Services"
          >
            NovaPay Financial Services
          </div>
        </div>
        <ChevronDown size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-subtle)',
                padding: '0 12px 8px',
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  marginBottom: 2,
                  borderRadius: 6,
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease, color 0.15s ease',
                })}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--bg-border)',
          fontSize: '0.6875rem',
          color: 'var(--text-subtle)',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>NovaPay FinSec</div>
        <div>v1.0 · Hackathon</div>
      </div>
    </aside>
  );
}
