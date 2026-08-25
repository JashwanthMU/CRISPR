import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import CountUp from './CountUp';
import InfoTooltip from './InfoTooltip';

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: number; // magnitude, e.g. 3
  trendDirection?: 'up' | 'down'; // up = risk increased (bad, red), down = risk decreased (good, green)
  icon?: ReactNode;
  accentColor?: string;
  demo?: boolean;
  tooltip?: string;
  sparkline?: number[];
  navigateTo?: string;
  navigateFilter?: Record<string, string>;
}

/**
 * Compact Google Cloud Console-style metric card: small icon chip, muted
 * label, one primary metric, a comparison delta pill, and an optional thin
 * sparkline. Click-through navigation is preserved from the previous
 * implementation — only the visual language changed.
 */
export default function KPICard({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendDirection,
  icon,
  accentColor = 'var(--color-primary-blue)',
  demo,
  tooltip,
  sparkline,
  navigateTo,
}: Props) {
  const navigate = useNavigate();
  const trendGood = trendDirection === 'down';
  const isPrimaryBlue = accentColor === 'var(--color-primary-blue)' || accentColor === '#1a73e8';
  const clickable = !!navigateTo;
  const isNumeric = typeof value === 'number';
  const deltaClass = trendDirection === 'up' ? (trendGood ? 'up-good' : 'up-bad') : trendGood ? 'down-good' : 'down-bad';

  return (
    <div
      className={`metric-card${clickable ? ' clickable' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => navigate(navigateTo!) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(navigateTo!);
            }
          : undefined
      }
    >
      {demo && (
        <span className="demo-badge">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-warning)' }} />
          Demo data
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {icon && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm)',
              // Strict palette: only the primary-blue icon gets the light-blue
              // chip background; critical/warning/success icons sit on plain
              // white with a neutral border (per the metric-card color rules —
              // semantic colors are never used as tinted surface fills).
              background: isPrimaryBlue ? 'var(--color-light-blue)' : 'var(--color-bg)',
              border: isPrimaryBlue ? 'none' : '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">
        {isNumeric ? <CountUp value={value as number} /> : value}
        {unit && <span style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', fontWeight: 500, marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap', minHeight: 20 }}>
        {trend !== undefined && (
          <span className={`metric-delta ${deltaClass}`}>
            {trendDirection === 'up' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trend}
            {typeof trend === 'number' && trend < 100 ? 'pts' : ''}
          </span>
        )}
        {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</span>}
      </div>
      {sparkline && sparkline.length > 1 && (
        <svg width="100%" height={28} viewBox="0 0 100 28" preserveAspectRatio="none" style={{ marginTop: 10, display: 'block' }}>
          <polyline
            points={sparkline
              .map((v, i) => {
                const min = Math.min(...sparkline);
                const max = Math.max(...sparkline);
                const range = max - min || 1;
                const x = (i / (sparkline.length - 1)) * 100;
                const y = 26 - ((v - min) / range) * 24;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke={accentColor}
            strokeWidth={1.6}
            opacity={0.85}
          />
        </svg>
      )}
    </div>
  );
}
