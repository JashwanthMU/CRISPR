import { useState, useEffect } from 'react';
import { FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from '../lib/toastStore';
import api from '../lib/api';

interface Policy {
  id: string;
  name: string;
  description: string;
  framework: string;
  enabled: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  version: number;
}

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    api.get('/api/policies').then((res) => {
      setPolicies(res.data.policies || []);
    });
  }, []);

  const toggle = async (policy: Policy) => {
    try {
      const res = await api.patch(`/api/policies/${policy.id}/toggle`, { expected_version: policy.version });
      setPolicies((prev) => prev.map((p) => (p.id === policy.id ? res.data : p)));
      toast.success(res.data.message);
    } catch (e) {
      toast.error('Failed to toggle policy');
    }
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={22} color="var(--color-primary-blue)" /> Policies
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Guardrails enforced automatically across pipelines, cloud, and identity
        </p>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Framework</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td style={{ maxWidth: 380 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description}</div>
                </td>
                <td>{p.framework}</td>
                <td>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: p.severity === 'CRITICAL' ? 'var(--sev-critical)' : p.severity === 'HIGH' ? 'var(--sev-high)' : 'var(--sev-medium)',
                    }}
                  >
                    {p.severity}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => toggle(p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.enabled ? 'var(--sev-low)' : 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}
                    aria-pressed={p.enabled}
                  >
                    {p.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    {p.enabled ? 'Enforced' : 'Disabled'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
