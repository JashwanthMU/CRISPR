import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Gitlab, GitCommit, ShieldAlert } from 'lucide-react';
import { REPOSITORIES, CODE_ISSUES, SCA_FINDINGS } from '../demo/fixtures';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import OpenPrModal from '../components/codesecurity/OpenPrModal';
import EmptyState from '../components/common/EmptyState';
import { TOKENS } from '../utils/format';

const TABS = ['Overview', 'Findings', 'Dependencies', 'Secrets', 'IaC', 'Commits', 'Scans'];

const MOCK_COMMITS = [
  { sha: 'a13f9c2', message: 'fix: rotate leaked staging credential', author: 'r.verma', date: '2026-08-23' },
  { sha: '9d02ab1', message: 'chore: bump spring-framework to 6.2.9', author: 'a.mehta', date: '2026-08-21' },
  { sha: '4e7710f', message: 'feat: add rate limiting to auth endpoints', author: 's.kapoor', date: '2026-08-18' },
];

export default function RepositoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const repo = REPOSITORIES.find((r) => r.id === id);
  const [tab, setTab] = useState('Overview');
  const [prOpen, setPrOpen] = useState(false);

  const issues = useMemo(() => CODE_ISSUES.filter((i) => i.repository === repo?.name), [repo]);
  const sca = useMemo(() => SCA_FINDINGS.filter((f) => f.repository === repo?.name), [repo]);
  const iacIssues = issues.filter((i) => i.category === 'iac');
  const secretIssues = issues.filter((i) => i.category === 'secrets');

  if (!repo) {
    return (
      <EmptyState
        title="Repository not found"
        description="This repository may have been disconnected or removed."
        action={
          <button className="btn-primary" onClick={() => navigate('/code-security')}>
            Back to Code Security
          </button>
        }
      />
    );
  }

  const ProviderIcon = repo.provider === 'gitlab' ? Gitlab : Github;

  return (
    <div className="page-container page-stack">
      <button className="btn-secondary animate-in" style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/code-security')}>
        <ArrowLeft size={14} /> Back to Code Security
      </button>

      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProviderIcon size={22} color="var(--color-text-secondary)" />
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{repo.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {repo.provider} · {repo.defaultBranch} · Last scan {new Date(repo.lastScan).toLocaleString()} · Owner: {repo.owners.map((o) => o.name).join(', ')}
          </div>
        </div>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Security Score" value={repo.securityScore} unit="/100" accentColor={repo.securityScore >= 70 ? TOKENS.success : repo.securityScore >= 50 ? TOKENS.sevHigh : TOKENS.critical} icon={<ShieldAlert size={16} />} />
        <KPICard title="Critical Issues" value={repo.criticalIssues} accentColor={TOKENS.critical} icon={<ShieldAlert size={16} />} />
        <KPICard title="Open Vulnerabilities" value={repo.openVulnerabilities} accentColor={TOKENS.sevHigh} icon={<ShieldAlert size={16} />} />
        <KPICard title="Secrets Detected" value={repo.secrets} accentColor={TOKENS.warning} icon={<ShieldAlert size={16} />} />
      </div>

      <div className="card">
        <div className="drawer-tabs" style={{ padding: 0, marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t} className={`drawer-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div className="card-title">Repository Details</div>
              <table className="data-table">
                <tbody>
                  <tr>
                    <td>Language</td>
                    <td>{repo.language}</td>
                  </tr>
                  <tr>
                    <td>Framework</td>
                    <td>{repo.framework}</td>
                  </tr>
                  <tr>
                    <td>Default Branch</td>
                    <td>{repo.defaultBranch}</td>
                  </tr>
                  <tr>
                    <td>Dependencies</td>
                    <td>{repo.dependencies}</td>
                  </tr>
                  <tr>
                    <td>IaC Issues</td>
                    <td>{repo.iacIssues}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <div className="card-title">Issue Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['critical', 'high', 'medium', 'low'] as const).map((k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <SeverityBadge severity={k.toUpperCase()} />
                    <span style={{ fontWeight: 600 }}>{repo.issues[k]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Findings' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Severity</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td style={{ maxWidth: 320 }}>{i.rule}</td>
                  <td>
                    <SeverityBadge severity={i.severity} />
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{i.category}</td>
                  <td>{i.status.replace('_', ' ')}</td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">No open findings for this repository.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'Dependencies' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>CVE</th>
                <th>Severity</th>
                <th>Component</th>
                <th>Version</th>
                <th>Fixed Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sca.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{f.cve}</td>
                  <td>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td>{f.component}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{f.version}</td>
                  <td style={{ color: 'var(--color-success)' }}>{f.fixedVersion}</td>
                  <td>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.6875rem' }} onClick={() => setPrOpen(true)}>
                      Open PR
                    </button>
                  </td>
                </tr>
              ))}
              {sca.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">No vulnerable dependencies detected.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'Secrets' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Severity</th>
                <th>Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {secretIssues.map((i) => (
                <tr key={i.id}>
                  <td>{i.rule}</td>
                  <td>
                    <SeverityBadge severity={i.severity} />
                  </td>
                  <td>{i.issues}</td>
                </tr>
              ))}
              {secretIssues.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">No secrets detected in this repository.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'IaC' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Severity</th>
                <th>Framework</th>
              </tr>
            </thead>
            <tbody>
              {iacIssues.map((i) => (
                <tr key={i.id}>
                  <td>{i.rule}</td>
                  <td>
                    <SeverityBadge severity={i.severity} />
                  </td>
                  <td>{i.framework}</td>
                </tr>
              ))}
              {iacIssues.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">No infrastructure-as-code issues detected.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'Commits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_COMMITS.map((c) => (
              <div key={c.sha} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-secondary)' }}>
                <GitCommit size={14} color="var(--color-text-secondary)" />
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-primary-blue)' }}>{c.sha}</span>
                <span style={{ flex: 1, fontSize: '0.8125rem' }}>{c.message}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{c.author}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.date}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Scans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['SAST', 'SCA', 'Secrets', 'IaC'].map((scanType) => (
              <div key={scanType} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-secondary)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{scanType} Scan</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Completed · {new Date(repo.lastScan).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <OpenPrModal
        open={prOpen}
        onClose={() => setPrOpen(false)}
        repository={repo.name}
        branch={repo.defaultBranch}
        packageName={sca[0]?.component ?? 'dependency'}
        targetVersion={sca[0]?.fixedVersion ?? 'latest'}
        resourceLabel={`container image ${repo.name.split('/')[1]}`}
      />
    </div>
  );
}
