interface Props {
  status: 'connected' | 'disconnected' | string;
}

export default function SourceStatusDot({ status }: Props) {
  const connected = status === 'connected';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: connected ? 'var(--sev-low)' : 'var(--text-subtle)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: connected ? 'var(--sev-low)' : 'var(--text-subtle)',
          display: 'inline-block',
        }}
      />
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  );
}
