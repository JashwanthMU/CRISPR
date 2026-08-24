import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Link2 } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import ProgressBar from '../components/common/ProgressBar';
import FindingDetailDrawer from '../components/findings/FindingDetailDrawer';
import { getFindings, getRiskCases } from '../lib/api';
import { sourceColor, sourceLabel } from '../utils/format';
import { toast } from '../lib/toastStore';
import type { Finding, RiskCase } from '../types';
import { SkeletonTable } from '../components/common/Skeleton';

export default function Findings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [risks, setRisks] = useState<RiskCase[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);

  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState(searchParams.get('severity') ?? 'ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    Promise.all([getFindings(), getRiskCases()]).then(([f, r]) => {
      setFindings(f);
      setRisks(r);
    });
  }, []);

  useEffect(() => {
    const sev = searchParams.get('severity');
    if (sev) setSevFilter(sev);
  }, [searchParams]);

  const correlatedAssetIds = useMemo(() => new Set(risks.filter((r) => (r.sources ?? []).length > 1).map((r) => r.asset_id)), [risks]);

  const filtered = useMemo(() => {
    if (!findings) return [];
    return findings.filter((f) => {
      if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.finding_id.toLowerCase().includes(search.toLowerCase())) return false;
      if (sevFilter !== 'ALL' && f.severity !== sevFilter) return false;
      if (sourceFilter !== 'ALL' && f.source_type !== sourceFilter) return false;
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      return true;
    });
  }, [findings, search, sevFilter, sourceFilter, statusFilter]);

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    findings?.forEach((f) => {
      if (f.severity in c) c[f.severity as keyof typeof c]++;
    });
    return c;
  }, [findings]);

  const bulkResolve = (ids: string[]) => {
    toast.success(`${ids.length} finding(s) marked resolved`);
    setSelected(new Set());
  };

  const columns: ColumnDef<Finding>[] = [
    { key: 'severity', header: 'Severity', sortValue: (f) => f.severity, render: (f) => <SeverityBadge severity={f.severity} /> },
    {
      key: 'title',
      header: 'Finding',
      sortValue: (f) => f.title,
      render: (f) => (
        <div>
          <div>{f.title}</div>
          {correlatedAssetIds.has(f.asset_id) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: 2 }}>
              <Link2 size={10} /> correlated
            </div>
          )}
        </div>
      ),
    },
    { key: 'asset_id', header: 'Resource', sortValue: (f) => f.asset_id, render: (f) => f.asset_id },
    {
      key: 'source_type',
      header: 'Source',
      sortValue: (f) => f.source_type,
      render: (f) => (
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--color-bg)',
            border: `1px solid ${sourceColor(f.source_type)}`,
            color: sourceColor(f.source_type),
          }}
        >
          {sourceLabel(f.source_type)}
        </span>
      ),
    },
    { key: 'finding_type', header: 'Category', sortValue: (f) => f.finding_type, render: (f) => f.finding_type },
    { key: 'cve', header: 'CVE / Rule', sortValue: (f) => f.cve ?? '', render: (f) => <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{f.cve ?? '—'}</span> },
    {
      key: 'confidence',
      header: 'Confidence',
      sortValue: (f) => f.confidence,
      render: (f) => <ProgressBar value={Math.round(f.confidence * 100)} showValue={false} height={5} />,
      width: '90px',
    },
    { key: 'status', header: 'Status', sortValue: (f) => f.status, render: (f) => (
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: f.status === 'OPEN' ? 'var(--sev-critical)' : f.status === 'VALIDATED' ? 'var(--sev-high)' : 'var(--sev-medium)' }}>
        {f.status}
      </span>
    ) },
    { key: 'first_seen', header: 'Detected', sortValue: (f) => f.first_seen, render: (f) => <span style={{ color: 'var(--text-muted)' }}>{f.first_seen}</span> },
  ];

  return (
    <div className="page-container page-stack">
      <div className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Findings Explorer</h1>
          <p className="page-subtitle">All raw findings correlated across every connected source</p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => toast.success('Export started', 'findings.csv')}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Stats bar */}
      <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{findings?.length ?? 0}</div>
        </div>
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
          <div key={sev} style={{ cursor: 'pointer' }} onClick={() => { setSevFilter(sev); setSearchParams({ severity: sev }); }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{sev}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              <span style={{ color: sev === 'CRITICAL' ? 'var(--sev-critical)' : sev === 'HIGH' ? 'var(--sev-high)' : sev === 'MEDIUM' ? 'var(--sev-medium)' : 'var(--sev-low)' }}>
                {counts[sev]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        {!findings ? (
          <SkeletonTable rows={6} cols={9} />
        ) : (
          <>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search findings..."
              selects={[
                {
                  key: 'severity',
                  value: sevFilter,
                  onChange: (v) => {
                    setSevFilter(v);
                    v === 'ALL' ? setSearchParams({}) : setSearchParams({ severity: v });
                  },
                  options: [
                    { value: 'ALL', label: 'All Severities' },
                    { value: 'CRITICAL', label: 'Critical' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'LOW', label: 'Low' },
                  ],
                },
                {
                  key: 'source',
                  value: sourceFilter,
                  onChange: setSourceFilter,
                  options: [
                    { value: 'ALL', label: 'All Sources' },
                    { value: 'BUG_BOUNTY', label: 'Bug Bounty' },
                    { value: 'VULNERABILITY_SCANNER', label: 'Vuln Scanner' },
                    { value: 'XDR', label: 'XDR' },
                    { value: 'IAM', label: 'IAM' },
                    { value: 'THREAT_INTEL', label: 'Threat Intel' },
                  ],
                },
                {
                  key: 'status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'OPEN', label: 'Open' },
                    { value: 'VALIDATED', label: 'Validated' },
                    { value: 'TRIAGED', label: 'Triaged' },
                  ],
                },
              ]}
            />
            <DataTable
              columns={columns}
              rows={filtered}
              getRowId={(f) => f.finding_id}
              onRowClick={setActiveFinding}
              selectable
              selected={selected}
              onSelectedChange={setSelected}
              defaultSortKey="severity"
              bulkActions={(ids) => (
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.6875rem' }} onClick={() => bulkResolve(ids)}>
                  Mark {ids.length} Resolved
                </button>
              )}
            />
          </>
        )}
      </div>

      <FindingDetailDrawer
        finding={activeFinding}
        correlatedRiskCase={risks.find((r) => r.asset_id === activeFinding?.asset_id)}
        open={!!activeFinding}
        onClose={() => setActiveFinding(null)}
      />
    </div>
  );
}
