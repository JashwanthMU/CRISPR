interface Props {
  height?: number;
  width?: string | number;
  style?: React.CSSProperties;
}

export default function Skeleton({ height = 14, width = '100%', style }: Props) {
  return <div className="skeleton skeleton-line" style={{ height, width, ...style }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <Skeleton width="40%" height={12} style={{ marginBottom: 16 }} />
      <Skeleton width="60%" height={28} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={10} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card">
      <Skeleton width="30%" height={12} style={{ marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={12} width={`${100 / cols}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}
