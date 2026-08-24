import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TOKENS } from '../../utils/format';

export interface TrendSeriesDef {
  key: string;
  label: string;
  color: string;
}

interface Props {
  data: Record<string, any>[];
  xKey: string;
  series: TrendSeriesDef[];
  height?: number;
  defaultSeries?: string[];
  ranges?: { id: string; label: string }[];
  activeRange?: string;
  onRangeChange?: (id: string) => void;
}

const DEFAULT_RANGES = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
];

/**
 * Multi-series, range-selectable trend chart used on the Security Dashboard.
 * Series can be toggled on/off via the legend chips; the active time range
 * is controlled externally (wired to the shared dashboard filter state) so
 * every chart on the page can respond to the same top-bar range selector.
 */
export default function InteractiveTrendChart({ data, xKey, series, height = 240, defaultSeries, ranges = DEFAULT_RANGES, activeRange, onRangeChange }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(defaultSeries ?? series.map((s) => s.key)));

  const toggle = (key: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size === 1) return next; // keep at least one series visible
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const visibleSeries = useMemo(() => series.filter((s) => enabled.has(s.key)), [series, enabled]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {series.map((s) => (
            <button
              key={s.key}
              className="chip"
              onClick={() => toggle(s.key)}
              style={{
                borderColor: enabled.has(s.key) ? s.color : TOKENS.border,
                color: enabled.has(s.key) ? TOKENS.textPrimary : TOKENS.textMuted,
                opacity: enabled.has(s.key) ? 1 : 0.55,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              {s.label}
            </button>
          ))}
        </div>
        {onRangeChange && (
          <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => onRangeChange(r.id)}
                style={{
                  border: 'none',
                  background: activeRange === r.id ? TOKENS.primaryBlue : 'transparent',
                  color: activeRange === r.id ? '#fff' : TOKENS.textSecondary,
                  borderRadius: 5,
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 120ms ease',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.divider} vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }}
            cursor={{ stroke: TOKENS.border, strokeDasharray: '3 3' }}
          />
          <Legend wrapperStyle={{ display: 'none' }} />
          {visibleSeries.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive
              animationDuration={500}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
