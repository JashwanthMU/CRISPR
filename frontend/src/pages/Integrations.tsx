import { useState, useEffect } from 'react';
import { Blocks, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import api from '../lib/api';
import { toast } from '../lib/toastStore';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: 'connected' | 'disconnected';
  last_sync: string | null;
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    api.get('/api/integrations').then((res) => {
      setIntegrations(res.data.integrations || []);
    });
  }, []);

  const reconnect = async (id: string) => {
    try {
      const res = await api.post(`/api/integrations/${id}/reconnect`);
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'connected', last_sync: res.data.last_sync } : i))
      );
      toast.success(res.data.message);
    } catch (e) {
      toast.error('Failed to reconnect');
    }
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Blocks size={22} color="var(--color-primary-blue)" /> Integrations
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Connect security tools and infrastructure to feed the risk engine
        </p>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Integration</th>
              <th>Category</th>
              <th>Status</th>
              <th>Last Sync</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((i) => (
              <tr key={i.id}>
                <td style={{ fontWeight: 600 }}>{i.name}</td>
                <td>{i.category}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: i.status === 'connected' ? 'var(--success)' : 'var(--sev-critical)',
                    }}
                  >
                    {i.status === 'connected' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {i.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {i.last_sync ? new Date(i.last_sync).toLocaleString() : 'Never'}
                </td>
                <td>
                  {i.status === 'disconnected' && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => reconnect(i.id)}
                    >
                      <RefreshCw size={12} /> Reconnect
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
