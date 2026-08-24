import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { SEVERITY_ICON } from '../../config/icons';
import { severityColor } from '../../utils/format';
import { activateOnEnter } from '../../utils/a11y';

interface Row {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
  trendPct: number;
  remediationRate: number;
}

interface Props {
  rows: Row[];
}

/** Severity distribution summary — clicking a row navigates to Findings pre-filtered by severity. */
export default function FindingsSummary({ rows }: Props) {
  const navigate = useNavigate();
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => {
        const Icon = SEVERITY_ICON[r.severity];
        const color = severityColor(r.severity);
        const pct = Math.round((r.count / total) * 100);
        return (
          <div
            key={r.severity}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/findings?severity=${r.severity}`)}
            onKeyDown={activateOnEnter(() => navigate(`/findings?severity=${r.severity}`))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: 'var(--color-bg-secondary)',
              transition: 'background var(--motion-fast) var(--ease-standard)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-light-blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
          >
            <Icon size={15} color={color} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color, width: 64 }}>{r.severity}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)', width: 28, textAlign: 'right' }}>{r.count}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: r.trendPct <= 0 ? 'var(--color-success)' : 'var(--color-critical)',
                width: 40,
              }}
            >
              {r.trendPct <= 0 ? <ArrowDown size={9} /> : <ArrowUp size={9} />}
              {Math.abs(r.trendPct)}%
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', width: 78, textAlign: 'right' }}>{r.remediationRate}% fixed</span>
          </div>
        );
      })}
    </div>
  );
}
