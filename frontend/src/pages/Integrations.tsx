import { useLanguage } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { Plug, RefreshCw, Settings2, Power, PlugZap } from 'lucide-react';
import { INTEGRATIONS } from '../demo/fixtures';
import IntegrationLogo from '../components/common/IntegrationLogo';
import { toast } from '../lib/toastStore';
import { TOKENS } from '../utils/format';
import type { Integration, IntegrationStatus } from '../types';
import { API_MODE, getIntegrations, httpClient } from '../lib/api';

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
  const { t } = useLanguage();
  const [items, setItems] = useState<Integration[]>(API_MODE === 'demo' ? INTEGRATIONS.map((i) => ({ ...i })) : []);

  useEffect(() => {
    getIntegrations().then(setItems).catch((error) => {
      toast.error('Integrations unavailable', error?.response?.data?.detail ?? error.message);
    });
  }, []);

  const connect = (id: string) => {
    if (API_MODE !== 'demo') {
      toast.info('Credential required', 'Configure a GitHub token and organization through the integration configuration endpoint.');
      return;
    }
    const integration = items.find((item) => item.id === id);
    toast.info('Demo catalogue entry', `${integration?.name ?? 'This connector'} is not a live adapter in this workspace.`);
  };

  const reconnect = async (id: string) => {
    if (API_MODE !== 'demo') {
      try {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'syncing' } : i)));
        await httpClient.post(`/api/integrations/${id}/reconnect`);
        await httpClient.post(`/api/integrations/${id}/sync`);
        setItems(await getIntegrations());
        toast.success('Sync queued', 'Credentials were verified and a durable synchronization job was queued.');
      } catch (error: any) {
        setItems(await getIntegrations().catch(() => items));
        toast.error('Reconnect failed', error?.response?.data?.detail ?? error.message);
      }
      return;
    }
    toast.info('Demo catalogue entry', 'No external connection or synchronization is performed in the demo workspace.');
  };

  const disable = async (id: string) => {
    if (API_MODE !== 'demo') {
      try {
        await httpClient.post(`/api/integrations/${id}/disable`);
        setItems(await getIntegrations());
        toast.warning('Integration disabled', 'The stored credential was removed and synchronization stopped.');
      } catch (error: any) {
        toast.error('Disable failed', error?.response?.data?.detail ?? error.message);
      }
      return;
    }
    toast.info('Demo catalogue entry', 'Demo source states are fixed evidence and cannot be presented as live operations.');
  };

  const testConnection = async (integration: Integration) => {
    if (API_MODE !== 'demo') {
      try {
        const { data } = await httpClient.post(`/api/integrations/${integration.id}/reconnect`);
        toast.success('Connection healthy', `${data.account ?? integration.name} authenticated successfully.`);
      } catch (error: any) {
        toast.error('Connection failed', error?.response?.data?.detail ?? error.message);
      }
      return;
    }
    toast.info('Demo catalogue entry', `${integration.name} has no external endpoint to test in this workspace.`);
  };

  const connectedCount = items.filter((i) => i.status === 'connected' || i.status === 'syncing').length;

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Plug size={22} color="var(--color-primary-blue)" /> {t("Integrations")}
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
                  <div style={{ marginTop: 3, fontSize: '0.625rem', fontWeight: 700, color: API_MODE === 'demo' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {API_MODE === 'demo' ? 'DEMO DATA' : integration.key === 'github' || integration.key === 'generic_http' ? 'LIVE ADAPTER' : 'PLANNED'}
                  </div>
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
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.6875rem' }} onClick={() => testConnection(integration)}>
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
