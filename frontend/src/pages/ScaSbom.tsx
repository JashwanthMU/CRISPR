import { useMemo, useState } from 'react';
import { Package, Gitlab } from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { REPOSITORIES, SCA_FINDINGS } from '../demo/fixtures';
import { toast } from '../lib/toastStore';
import { TOKENS } from '../utils/format';

export default function ScaSbom() {
  const [activeRepo, setActiveRepo] = useState(REPOSITORIES[1].name); // payments-service by default
  const [runtimeOnly, setRuntimeOnly] = useState(false);

  const findings = useMemo(
    () => SCA_FINDINGS.filter((f) => f.repository === activeRepo && (!runtimeOnly || f.reachable)),
    [activeRepo, runtimeOnly]
  );

  const repo = REPOSITORIES.find((r) => r.name === activeRepo);

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={22} color="var(--color-success)" /> SCA & SBOM
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem', maxWidth: 640 }}>
          Gain visibility into every software component. Detect vulnerabilities in direct and transitive
          dependencies and prioritize the reachable ones with runtime context from the CRISPR sensor.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {REPOSITORIES.map((r) => (
          <button
            key={r.id}
            className="chip"
            onClick={() => setActiveRepo(r.name)}
            style={{ borderColor: activeRepo === r.name ? 'var(--color-primary-blue)' : 'var(--color-border)', color: activeRepo === r.name ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Dependency Count" value={repo?.dependencies ?? 0} accentColor={TOKENS.primaryBlue} icon={<Package size={16} />} />
        <KPICard title="Vulnerable Dependencies" value={findings.length} accentColor={TOKENS.sevHigh} icon={<Package size={16} />} />
        <KPICard title="Critical Dependencies" value={findings.filter((f) => f.severity === 'CRITICAL').length} accentColor={TOKENS.critical} icon={<Package size={16} />} />
        <KPICard title="Reachable Vulnerabilities" value={findings.filter((f) => f.reachable).length} accentColor={TOKENS.warning} icon={<Package size={16} />} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gitlab size={18} color="var(--color-text-secondary)" />
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: '0.9375rem' }}>{activeRepo}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>{repo?.provider === 'gitlab' ? 'GitLab Project' : 'GitHub Repository'}</div>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={runtimeOnly} onChange={(e) => setRuntimeOnly(e.target.checked)} />
            Validated in Runtime
          </label>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Finding</th>
              <th>Severity</th>
              <th>Component</th>
              <th>Version</th>
              <th>Fixed Version</th>
              <th>Reachable</th>
              <th>Exploit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{f.cve}</td>
                <td>
                  <SeverityBadge severity={f.severity} />
                </td>
                <td>{f.component}</td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{f.version}</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 500 }}>{f.fixedVersion ?? '—'}</td>
                <td>{f.reachable ? <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'var(--color-text-muted)' }}>No</span>}</td>
                <td>{f.exploitAvailable ? <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>Yes</span> : <span style={{ color: 'var(--color-text-muted)' }}>No</span>}</td>
                <td>{f.status.replace('_', ' ')}</td>
                <td>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
                    onClick={() => toast.success('Pull request opened', `Upgrade ${f.component} to ${f.fixedVersion} on ${activeRepo}.`)}
                  >
                    Open PR
                  </button>
                </td>
              </tr>
            ))}
            {findings.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">No vulnerability findings for the selected filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
