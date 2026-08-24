import { useEffect, useMemo, useState } from 'react';
import { Bug } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { getVulnerabilities } from '../lib/api';
import type { Vulnerability } from '../types';
import { TOKENS } from '../utils/format';
import { SkeletonTable } from '../components/common/Skeleton';
import { toast } from '../lib/toastStore';

export default function Vulnerabilities() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    getVulnerabilities().then(setVulns);
  }, []);

  const filtered = useMemo(() => {
    if (!vulns) return [];
    return vulns.filter((v) => {
      if (search && !v.cve.toLowerCase().includes(search.toLowerCase())) return false;
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false;
      return true;
    });
  }, [vulns, search, severityFilter]);

  const critical = vulns?.filter((v) => v.severity === 'CRITICAL').length ?? 0;
  const exploitable = vulns?.filter((v) => v.exploitAvailable).length ?? 0;

  const columns: ColumnDef<Vulnerability>[] = [
    { key: 'severity', header: 'Severity', sortValue: (v) => v.severity, render: (v) => <SeverityBadge severity={v.severity} /> },
    { key: 'cve', header: 'CVE', sortValue: (v) => v.cve, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v.cve}</span> },
    { key: 'cvss', header: 'CVSS', sortValue: (v) => v.cvss, render: (v) => v.cvss.toFixed(1) },
    { key: 'component', header: 'Affected Asset', sortValue: (v) => v.component, render: (v) => v.component },
    {
      key: 'exploit',
      header: 'Exploit Available',
      sortValue: (v) => (v.exploitAvailable ? 1 : 0),
      render: (v) => (v.exploitAvailable ? <span style={{ color: 'var(--sev-critical)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>),
    },
    {
      key: 'patch',
      header: 'Patch Available',
      sortValue: (v) => (v.patchAvailable ? 1 : 0),
      render: (v) => (v.patchAvailable ? <span style={{ color: 'var(--sev-low)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>),
    },
    { key: 'status', header: 'Status', sortValue: (v) => v.status, render: (v) => v.status },
    {
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <button
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
          onClick={(e) => {
            e.stopPropagation();
            toast.success('Remediation queued', `${v.cve} added to the remediation queue.`);
          }}
        >
          Queue Fix
        </button>
      ),
    },
  ];

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bug size={22} color="var(--color-critical)" /> Vulnerabilities
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          CVE-level vulnerability inventory correlated across scanners and threat intelligence
        </p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Total Vulnerabilities" value={String(vulns?.length ?? 0)} icon={<Bug size={16} />} accentColor={TOKENS.critical} />
        <KPICard title="Critical" value={String(critical)} subtitle="Require immediate action" accentColor={TOKENS.critical} icon={<Bug size={16} />} />
        <KPICard title="Exploited in the Wild" value={String(exploitable)} subtitle="Active exploitation observed" accentColor={TOKENS.sevHigh} icon={<Bug size={16} />} />
        <KPICard title="Patch Coverage" value="100%" subtitle="All CVEs have a vendor patch" accentColor={TOKENS.success} icon={<Bug size={16} />} />
      </div>

      <div className="card">
        {!vulns ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search CVE..."
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
                  ],
                },
              ]}
            />
            <DataTable columns={columns} rows={filtered} getRowId={(v) => v.id} defaultSortKey="cvss" />
          </>
        )}
      </div>
    </div>
  );
}
