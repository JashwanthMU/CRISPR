import { useEffect, useState } from 'react';
import { Plug, RefreshCw, Settings2, Power, PlugZap } from 'lucide-react';
import { INTEGRATIONS } from '../demo/fixtures';
import IntegrationLogo from '../components/common/IntegrationLogo';
import { toast } from '../lib/toastStore';
import { TOKENS } from '../utils/format';
import type { Integration, IntegrationStatus } from '../types';

const STATUS_COLOR: Record<IntegrationStatus, string> = {
  connected: TOKENS.success,
  disconnected: TOKENS.textMuted,
  connecting: TOKENS.primaryBlue,
  error: TOKENS.critical,
  syncing: TOKENS.primaryBlue,
};

const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  error: 'Error',
  syncing: 'Syncing…',
};

export default function Integrations() {
  const [items, setItems] = useState<Integration[]>(INTEGRATIONS.map((i) => ({ ...i })));

  useEffect(() => {
    // Simulate any items in 'connecting' state resolving to 'connected' after a delay.
    const connecting = items.filter((i) => i.status === 'connecting');
    if (connecting.length === 0) return;
    const timer = setTimeout(() => {
      setItems((prev) =>
        prev.map((i) =>
          i.status === 'connecting'
            ? { ...i, status: 'connected', lastSync: new Date().toISOString(), itemsIngested: Math.floor(Math.random() * 40) + 5 }
            : i
        )
      );
      connecting.forEach((i) => toast.success(`${i.name} connected`, 'Initial sync completed successfully.'));
    }, 1800);
    return () => clearTimeout(timer);
  }, [items]);

  const connect = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'connecting' } : i)));
    toast.info('Connecting…', 'Establishing a secure connection and requesting scopes.');
  };

  const reconnect = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'syncing' } : i)));
    setTimeout(() => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'connected', lastSync: new Date().toISOString() } : i)));
      toast.success('Reconnected', 'Sync completed successfully.');
    }, 1400);
  };

  const disable = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'disconnected', itemsIngested: 0 } : i)));
    toast.warning('Integration disabled', 'Ingestion has been paused for this source.');
  };

  const testConnection = (name: string) => {
    toast.info('Testing connection…');
    setTimeout(() => toast.success('Connection healthy', `${name} responded in 214ms.`), 1000);
  };

  const connectedCount = items.filter((i) => i.status === 'connected' || i.status === 'syncing').length;

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Plug size={22} color="var(--color-primary-blue)" /> Integrations
        </h1>
        <p className="page-subtitle">
          {connectedCount} of {items.length} sources connected · manage ingestion across code, cloud, identity, and threat intelligence
        </p>
      </div>

      <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {items.map((integration, i) => (
          <div key={integration.id} className="card animate-in" style={{ animationDelay: `${i * 30}ms` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <IntegrationLogo integrationKey={integration.key} size={32} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{integration.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{integration.category.replace('_', ' ')}</div>
                </div>
              </div>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: STATUS_COLOR[integration.status],
                  transition: 'color var(--motion-base) var(--ease-standard)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: STATUS_COLOR[integration.status],
                    transition: 'background var(--motion-base) var(--ease-standard)',
                  }}
                />
                {STATUS_LABEL[integration.status]}
              </span>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', minHeight: 36, lineHeight: 1.5 }}>{integration.description}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              <span>{integration.itemsIngested} items ingested</span>
              {integration.errors > 0 && <span style={{ color: 'var(--color-warning)' }}>{integration.errors} error(s)</span>}
              {integration.lastSync && <span>Synced {new Date(integration.lastSync).toLocaleTimeString()}</span>}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {integration.status === 'disconnected' && (
                <button className="btn-primary" style={{ padding: '6px 10px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => connect(integration.id)}>
                  <PlugZap size={12} /> Connect
                </button>
              )}
              {(integration.status === 'connected' || integration.status === 'error') && (
                <>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => reconnect(integration.id)}>
                    <RefreshCw size={12} /> Reconnect
                  </button>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.6875rem' }} onClick={() => testConnection(integration.name)}>
                    Test
                  </button>
                  <button className="icon-btn" title="Configure" onClick={() => toast.info(`Configure ${integration.name}`, 'Configuration panel would open here.')}>
                    <Settings2 size={13} />
                  </button>
                  <button className="icon-btn" title="Disable" onClick={() => disable(integration.id)}>
                    <Power size={13} />
                  </button>
                </>
              )}
              {(integration.status === 'connecting' || integration.status === 'syncing') && (
                <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }} disabled>
                  <RefreshCw size={12} style={{ animation: 'spin-refresh 0.8s linear infinite' }} /> {integration.status === 'connecting' ? 'Connecting' : 'Syncing'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
