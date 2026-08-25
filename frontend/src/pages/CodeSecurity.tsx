import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Github, Gitlab } from 'lucide-react';
import KPICard from '../components/common/KPICard';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import ProgressBar from '../components/common/ProgressBar';
import RiskTrendChart from '../components/charts/RiskTrendChart';
import { REPOSITORIES, CODE_ISSUES } from '../demo/fixtures';
import { CATEGORY_ICON } from '../config/icons';
import { activateOnEnter } from '../utils/a11y';
import type { CodeIssue } from '../types';
import { TOKENS } from '../utils/format';

const SDLC_SCORES = [
  { name: 'OpenSSF Source Code Management', score: 41 },
  { name: 'CIS GitHub v1.0', score: 46 },
];

const CODE_TREND = [
  { month: 'Mar', eal: 210 },
  { month: 'Apr', eal: 232 },
  { month: 'May', eal: 249 },
  { month: 'Jun', eal: 261 },
  { month: 'Jul', eal: 274 },
  { month: 'Aug', eal: 274 },
];

export default function CodeSecurity() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const bySeverity = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    CODE_ISSUES.forEach((i) => {
      counts[i.severity] = (counts[i.severity] ?? 0) + i.issues;
    });
    return counts;
  }, []);

  const filteredIssues = useMemo(
    () =>
      CODE_ISSUES.filter((i) => {
        if (search && !i.rule.toLowerCase().includes(search.toLowerCase()) && !i.repository.toLowerCase().includes(search.toLowerCase())) return false;
        if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
        return true;
      }),
    [search, severityFilter]
  );

  const columns: ColumnDef<CodeIssue>[] = [
    { key: 'rule', header: 'Rule', sortValue: (i) => i.rule, render: (i) => <span style={{ maxWidth: 320, display: 'inline-block' }}>{i.rule}</span> },
    { key: 'issues', header: 'Issues', sortValue: (i) => i.issues, render: (i) => i.issues },
    {
      key: 'risks',
      header: 'Risks',
      render: (i) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {i.risks.map((r) => {
            const Icon = CATEGORY_ICON[r] ?? CATEGORY_ICON.posture;
            return (
              <span key={r} title={r} style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={11} color="var(--text-muted)" />
              </span>
            );
          })}
        </div>
      ),
    },
    { key: 'severity', header: 'Severity', sortValue: (i) => i.severity, render: (i) => <SeverityBadge severity={i.severity} /> },
    { key: 'repository', header: 'Repository', sortValue: (i) => i.repository, render: (i) => <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{i.repository}</span> },
    { key: 'branch', header: 'Branch', sortValue: (i) => i.branch, render: (i) => i.branch },
    { key: 'framework', header: 'Framework', sortValue: (i) => i.framework ?? '', render: (i) => i.framework ?? '—' },
    { key: 'status', header: 'Status', sortValue: (i) => i.status, render: (i) => i.status.replace(/_/g, ' ') },
  ];

  const orgLogos: Record<string, any> = { github: Github, gitlab: Gitlab };
  const reposByOrg = [
    { org: 'codesmiths', provider: 'github', count: REPOSITORIES.filter((r) => r.provider === 'github').length },
    { org: 'codesmiths-infra', provider: 'gitlab', count: REPOSITORIES.filter((r) => r.provider === 'gitlab').length },
  ];

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Code2 size={22} color="var(--color-primary-blue)" /> Code & CI/CD Security
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Secure development posture across repositories, pipelines, and infrastructure-as-code
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['SCA & SBOM', 'Infrastructure as Code', 'Secrets Scanning', 'DSPM in Code', 'Malware Scanning', 'AppSec Posture (ASPM)'].map((label) => (
          <button
            key={label}
            className="chip"
            onClick={() => (label === 'SCA & SBOM' ? navigate('/code-security/sca') : undefined)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="dashboard-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Code & CI/CD Issues by Severity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <div
                key={sev}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setSeverityFilter(sev)}
              >
                <SeverityBadge severity={sev} />
                <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{bySeverity[sev]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top Code & CI/CD Issues</div>
          <table className="data-table" style={{ fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th>Rule</th>
                <th>Issues</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {CODE_ISSUES.slice(0, 6).map((i) => (
                <tr
                  key={i.id}
                  tabIndex={0}
                  onClick={() => setSearch(i.repository)}
                  onKeyDown={activateOnEnter(() => setSearch(i.repository))}
                >
                  <td style={{ maxWidth: 280 }}>{i.rule}</td>
                  <td>{i.issues}</td>
                  <td>
                    <SeverityBadge severity={i.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">Code & CI/CD Issues Trend</div>
          <RiskTrendChart data={CODE_TREND} height={160} color={TOKENS.critical} />
        </div>
      </div>

      <div className="dashboard-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Repositories by Organization</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reposByOrg.map((o) => {
              const Icon = orgLogos[o.provider];
              return (
                <div key={o.org} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} color="var(--text-muted)" />
                  <span style={{ flex: 1, fontSize: '0.8125rem' }}>{o.org}</span>
                  <span style={{ fontWeight: 700 }}>{o.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">SDLC Compliance Score</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SDLC_SCORES.map((s) => (
              <div key={s.name}>
                <ProgressBar value={s.score} label={s.name} color={s.score >= 60 ? TOKENS.success : TOKENS.critical} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Top Cloud Resources Mapped from Code</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Container Images', count: 4 },
              { label: 'Storage Buckets', count: 6 },
              { label: 'Virtual Machines', count: 1 },
              { label: 'User Accounts', count: 0 },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.count > 0 ? 'var(--accent-cyan)' : 'var(--text-subtle)' }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Repositories</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Provider</th>
              <th>Security Score</th>
              <th>Critical</th>
              <th>Open Vulnerabilities</th>
              <th>Secrets</th>
              <th>Last Scan</th>
            </tr>
          </thead>
          <tbody>
            {REPOSITORIES.map((r) => {
              const Icon = orgLogos[r.provider] ?? Github;
              return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => navigate(`/code-security/repositories/${r.id}`)}
                  onKeyDown={activateOnEnter(() => navigate(`/code-security/repositories/${r.id}`))}
                >
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={14} color="var(--text-muted)" />
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{r.name}</span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{r.provider.replace('_', ' ')}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: r.securityScore >= 70 ? 'var(--sev-low)' : r.securityScore >= 50 ? 'var(--sev-medium)' : 'var(--sev-critical)' }}>
                      {r.securityScore}
                    </span>
                  </td>
                  <td style={{ color: 'var(--sev-critical)', fontWeight: 700 }}>{r.criticalIssues}</td>
                  <td>{r.openVulnerabilities}</td>
                  <td>{r.secrets}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(r.lastScan).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search issues by rule or repository..."
          selects={[
            {
              key: 'severity',
              value: severityFilter,
              onChange: setSeverityFilter,
              options: [
                { value: 'all', label: 'All Severities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ],
            },
          ]}
        />
        <DataTable columns={columns} rows={filteredIssues} getRowId={(i) => i.id} defaultSortKey="severity" />
      </div>
    </div>
  );
}
