import { useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { toast } from '../lib/toastStore';
import { TOKENS } from '../utils/format';
import { getFindings, httpClient } from '../lib/api';
import type { CodeIssue } from '../types';

export default function Secrets() {
  const [search, setSearch] = useState('');
  const [secretIssues, setSecretIssues] = useState<CodeIssue[]>([]);

  useEffect(() => {
    getFindings().then((findings) => setSecretIssues(findings
      .filter((finding) => /secret|credential|token|api key/i.test(`${finding.finding_type} ${finding.category ?? ''} ${finding.title}`))
      .map((finding) => ({
        id: finding.finding_id, rule: finding.title, issues: 1, risks: ['secret'], severity: finding.severity,
        repository: finding.asset_id, branch: '—', framework: finding.source_name, status: finding.status === 'RESOLVED' ? 'FIXED' : 'OPEN', category: 'secrets',
      }))));
  }, []);

  const filtered = useMemo(
    () => secretIssues.filter((i) => !search || i.rule.toLowerCase().includes(search.toLowerCase()) || i.repository.toLowerCase().includes(search.toLowerCase())),
    [secretIssues, search]
  );

  const columns: ColumnDef<CodeIssue>[] = [
    { key: 'severity', header: 'Severity', sortValue: (r) => r.severity, render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: 'rule', header: 'Finding', sortValue: (r) => r.rule, render: (r) => r.rule },
    { key: 'repository', header: 'Repository', sortValue: (r) => r.repository, render: (r) => <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.repository}</span> },
    { key: 'branch', header: 'Branch', sortValue: (r) => r.branch, render: (r) => r.branch },
    { key: 'issues', header: 'Occurrences', sortValue: (r) => r.issues, render: (r) => r.issues },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => r.status.replace(/_/g, ' ') },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <button
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
          onClick={async (e) => {
            e.stopPropagation();
            try {
              await httpClient.post('/api/remediation', { title: `Rotate secret: ${r.rule}`, finding_id: r.id, asset_id: r.repository, priority: r.severity === 'INFO' ? 'LOW' : r.severity, recommended_fix: 'Rotate and revoke the exposed credential.', metadata: { source: 'SECRET_SCANNING' } });
              toast.success('Rotation queued', 'A durable remediation item was created.');
            } catch { toast.error('Request failed', 'The backend could not create the remediation item.'); }
          }}
        >
          Request Rotation
        </button>
      ),
    },
  ];

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <KeyRound size={22} color="var(--color-primary-blue)" /> Secrets Scanning
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Hardcoded credentials, API keys, and tokens detected across source code and CI/CD
        </p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Exposed Secrets" value={String(secretIssues.reduce((a, i) => a + i.issues, 0))} accentColor={TOKENS.warning} icon={<KeyRound size={16} />} />
        <KPICard title="Repositories Affected" value={String(new Set(secretIssues.map((i) => i.repository)).size)} accentColor={TOKENS.sevHigh} icon={<KeyRound size={16} />} />
        <KPICard title="Critical Secrets" value={String(secretIssues.filter((i) => i.severity === 'CRITICAL').length)} accentColor={TOKENS.critical} icon={<KeyRound size={16} />} />
        <KPICard title="Open Rotation Items" value={String(secretIssues.filter((i) => i.status === 'OPEN').length)} accentColor={TOKENS.secondaryBlue} icon={<KeyRound size={16} />} />
      </div>

      <div className="card">
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search secrets by rule or repository..." />
        <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} defaultSortKey="severity" />
      </div>
    </div>
  );
}
