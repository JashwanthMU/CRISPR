import { useState } from 'react';
import { FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from '../lib/toastStore';

interface Policy {
  id: string;
  name: string;
  description: string;
  framework: string;
  enabled: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

const INITIAL_POLICIES: Policy[] = [
  { id: 'pol-1', name: 'Require MFA for all privileged accounts', description: 'Blocks provisioning of admin-tier IAM roles without MFA enforced.', framework: 'RBI CSF', enabled: true, severity: 'CRITICAL' },
  { id: 'pol-2', name: 'Disallow public S3 buckets in production', description: 'Flags and auto-remediates publicly readable storage buckets.', framework: 'ISO 27001', enabled: true, severity: 'CRITICAL' },
  { id: 'pol-3', name: 'Require signed commits on protected branches', description: 'Enforces commit signature verification on main/master branches.', framework: 'CIS Controls', enabled: false, severity: 'MEDIUM' },
  { id: 'pol-4', name: 'Block deploys with unresolved critical CVEs', description: 'CI/CD pipelines fail if a critical, reachable CVE is unresolved.', framework: 'NIST CSF', enabled: true, severity: 'HIGH' },
  { id: 'pol-5', name: 'Rotate service account secrets every 90 days', description: 'Flags secrets older than 90 days for mandatory rotation.', framework: 'SEBI CSCRF', enabled: false, severity: 'HIGH' },
];

export default function Policies() {
  const [policies, setPolicies] = useState(INITIAL_POLICIES);

  const toggle = (id: string) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
    const p = policies.find((x) => x.id === id);
    if (p) toast.success(p.enabled ? 'Policy disabled' : 'Policy enabled', p.name);
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
                    onClick={() => toggle(p.id)}
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
