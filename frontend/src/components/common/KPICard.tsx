import { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number; // magnitude, e.g. 3
  trendDirection?: 'up' | 'down'; // up = risk increased (bad, red), down = risk decreased (good, green)
  icon?: ReactNode;
  accentColor?: string;
  demo?: boolean;
}

export default function KPICard({ title, value, subtitle, trend, trendDirection, icon, accentColor = '#2563eb', demo }: Props) {
  const trendGood = trendDirection === 'down';
  return (
    <div className="card">
      {demo && (
        <span className="demo-badge">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sev-medium)' }} />
          Demo data
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="card-title" style={{ margin: 0 }}>
          {title}
        </div>
        {icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: `${accentColor}1a`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        {trend !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              background: trendGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: trendGood ? 'var(--sev-low)' : 'var(--sev-critical)',
            }}
          >
            {trendDirection === 'up' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {trend}
            {typeof trend === 'number' && trend < 100 ? 'pts' : ''}
          </span>
        )}
        {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
      </div>
    </div>
  );
}
