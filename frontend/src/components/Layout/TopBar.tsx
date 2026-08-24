import { Bell, Search } from 'lucide-react';

export default function TopBar() {
  return (
    <header
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--bg-border)',
        background: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-base)',
          border: '1px solid var(--bg-border)',
          borderRadius: 6,
          padding: '6px 12px',
          width: 320,
        }}
      >
        <Search size={14} color="var(--text-muted)" />
        <input
          placeholder="Search assets, findings, CVEs..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.8125rem',
            width: '100%',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <Bell size={18} color="var(--text-muted)" />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--sev-critical)',
            }}
          />
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#fff',
          }}
        >
          NP
        </div>
      </div>
    </header>
  );
}
