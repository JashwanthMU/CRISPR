import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { CODE_ISSUES } from '../demo/fixtures';
import { toast } from '../lib/toastStore';
import { TOKENS } from '../utils/format';

const SECRET_ISSUES = CODE_ISSUES.filter((c) => c.category === 'secrets');

export default function Secrets() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => SECRET_ISSUES.filter((i) => !search || i.rule.toLowerCase().includes(search.toLowerCase()) || i.repository.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const columns: ColumnDef<(typeof SECRET_ISSUES)[number]>[] = [
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
          onClick={(e) => {
            e.stopPropagation();
            toast.success('Secret rotation requested', `A rotation request for ${r.repository} has been sent to the owning team.`);
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
        <KPICard title="Exposed Secrets" value={String(SECRET_ISSUES.reduce((a, i) => a + i.issues, 0))} accentColor={TOKENS.warning} icon={<KeyRound size={16} />} />
        <KPICard title="Repositories Affected" value={String(new Set(SECRET_ISSUES.map((i) => i.repository)).size)} accentColor={TOKENS.sevHigh} icon={<KeyRound size={16} />} />
        <KPICard title="Active Cloud Keys" value="1" subtitle="With production permissions" accentColor={TOKENS.critical} icon={<KeyRound size={16} />} />
        <KPICard title="Avg. Time to Rotate" value="3.2" unit="days" accentColor={TOKENS.secondaryBlue} icon={<KeyRound size={16} />} />
      </div>

      <div className="card">
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search secrets by rule or repository..." />
        <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} defaultSortKey="severity" />
      </div>
    </div>
  );
}
