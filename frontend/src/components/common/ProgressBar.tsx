interface Props {
  value: number; // 0-100
  color?: string;
  height?: number;
  label?: string;
  showValue?: boolean;
}

export default function ProgressBar({ value, color = 'var(--color-primary-blue)', height = 6, label, showValue = true }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {label && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>}
          {showValue && <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{pct}%</span>}
        </div>
      )}
      <div style={{ width: '100%', height, borderRadius: height, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: height,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
