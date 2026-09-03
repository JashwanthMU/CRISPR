import { useEffect, useMemo, useState } from 'react';
import { Bug } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { API_MODE, getVulnerabilities, httpClient } from '../lib/api';
import type { Vulnerability } from '../types';
import { TOKENS } from '../utils/format';
import { SkeletonTable } from '../components/common/Skeleton';
import { toast } from '../lib/toastStore';

interface GlobalCve {
  cve: string;
  title: string;
  description: string;
  severity?: string;
  cvss?: number;
  published_date?: string;
  nvd_last_modified?: string;
  exploited_in_wild: boolean;
  nvd_url: string;
  cwe_ids: string[];
}

interface GlobalCvePage {
  items: GlobalCve[];
  total_results: number;
  start_index: number;
  results_per_page: number;
  window_days: number;
  source: string;
  fetched_at: string;
}

async function getGlobalCves(page: number, pageSize: number, days: number): Promise<GlobalCvePage> {
  const response = await httpClient.get('/api/ingestion/nvd/feed', {
    params: { page, page_size: pageSize, days }, timeout: 35000,
  });
  if (!Array.isArray(response?.data?.items)) throw new Error('NVD feed returned an invalid payload');
  return response.data;
}

export default function Vulnerabilities() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [tab, setTab] = useState<'organization' | 'global'>('organization');
  const [globalPage, setGlobalPage] = useState<GlobalCvePage | null>(null);
  const [globalPageNumber, setGlobalPageNumber] = useState(1);
  const [globalDays, setGlobalDays] = useState(7);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    getVulnerabilities().then(setVulns).catch((error) => {
      setVulns([]);
      toast.error('Vulnerabilities unavailable', error?.response?.data?.detail ?? error.message);
    });
  }, []);

  useEffect(() => {
    if (tab !== 'global') return;
    setGlobalPage(null);
    setGlobalError(null);
    getGlobalCves(globalPageNumber, 50, globalDays)
      .then(setGlobalPage)
      .catch((error) => setGlobalError(error?.response?.data?.detail ?? error.message));
  }, [tab, globalPageNumber, globalDays]);

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
  const patchDataKnown = vulns?.filter((v) => v.patchAvailable != null).length ?? 0;
  const patchDataPct = vulns?.length ? Math.round((patchDataKnown / vulns.length) * 100) : 0;

  const columns: ColumnDef<Vulnerability>[] = [
    { key: 'severity', header: 'Severity', sortValue: (v) => v.severity, render: (v) => <SeverityBadge severity={v.severity} /> },
    { key: 'cve', header: 'CVE', sortValue: (v) => v.cve, render: (v) => <span style={{ fontFamily: 'monospace' }}>{v.cve}</span> },
    { key: 'cvss', header: 'CVSS', sortValue: (v) => v.cvss ?? -1, render: (v) => v.cvss == null ? 'Unknown' : v.cvss.toFixed(1) },
    { key: 'component', header: 'Affected Asset', sortValue: (v) => v.component, render: (v) => v.component },
    {
      key: 'exploit',
      header: 'Exploited in Wild',
      sortValue: (v) => v.exploitAvailable == null ? -1 : (v.exploitAvailable ? 1 : 0),
      render: (v) => v.exploitAvailable == null ? <span style={{ color: 'var(--text-muted)' }}>Unknown</span> : (v.exploitAvailable ? <span style={{ color: 'var(--sev-critical)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>),
    },
    {
      key: 'patch',
      header: 'Patch Available',
      sortValue: (v) => v.patchAvailable == null ? -1 : (v.patchAvailable ? 1 : 0),
      render: (v) => v.patchAvailable == null ? <span style={{ color: 'var(--text-muted)' }}>Unknown</span> : (v.patchAvailable ? <span style={{ color: 'var(--sev-low)', fontWeight: 700 }}>Yes</span> : <span style={{ color: 'var(--text-muted)' }}>No</span>),
    },
    { key: 'status', header: 'Status', sortValue: (v) => v.status, render: (v) => v.status },
    {
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <button
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
          onClick={async (e) => {
            e.stopPropagation();
            if (API_MODE === 'demo') {
              toast.info('Demo mode', 'Remediation mutations are not persisted in demo mode.');
              return;
            }
            try {
              await httpClient.post('/api/remediation', {
                title: `Remediate ${v.cve}`,
                finding_id: v.id,
                asset_id: v.component,
                priority: v.severity,
                recommended_fix: `Review vendor guidance and remediate ${v.cve} on ${v.component}.`,
                metadata: { cve: v.cve, source: 'vulnerability_inventory' },
              });
              toast.success('Remediation queued', `${v.cve} was persisted in the remediation queue.`);
            } catch (error: any) {
              toast.error('Queue failed', error?.response?.data?.detail ?? error.message);
            }
          }}
        >
          Queue Fix
        </button>
      ),
    },
  ];

  const globalColumns: ColumnDef<GlobalCve>[] = [
    { key: 'severity', header: 'Severity', sortValue: (v) => v.severity ?? '', render: (v) => v.severity ? <SeverityBadge severity={v.severity as any} /> : 'Not scored' },
    { key: 'cve', header: 'CVE', sortValue: (v) => v.cve, render: (v) => <a href={v.nvd_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace' }}>{v.cve}</a> },
    { key: 'cvss', header: 'CVSS', sortValue: (v) => v.cvss ?? -1, render: (v) => v.cvss == null ? 'Not scored' : v.cvss.toFixed(1) },
    { key: 'published', header: 'Published', sortValue: (v) => v.published_date ?? '', render: (v) => v.published_date ?? 'Unknown' },
    { key: 'cwe', header: 'Weakness', render: (v) => v.cwe_ids?.slice(0, 2).join(', ') || 'Unknown' },
    { key: 'kev', header: 'CISA KEV', sortValue: (v) => v.exploited_in_wild ? 1 : 0, render: (v) => v.exploited_in_wild ? <span style={{ color: 'var(--sev-critical)', fontWeight: 700 }}>Listed</span> : 'No' },
    { key: 'description', header: 'Description', render: (v) => <span title={v.description}>{v.description.slice(0, 100)}{v.description.length > 100 ? '…' : ''}</span> },
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

      <div style={{ display: 'flex', gap: 8 }} role="tablist" aria-label="Vulnerability data scope">
        <button className={tab === 'organization' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('organization')}>Organization CVEs</button>
        <button className={tab === 'global' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('global')}>Global CVE Feed</button>
      </div>

      {tab === 'organization' && <><div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Total Vulnerabilities" value={String(vulns?.length ?? 0)} icon={<Bug size={16} />} accentColor={TOKENS.critical} />
        <KPICard title="Critical" value={String(critical)} subtitle="Require immediate action" accentColor={TOKENS.critical} icon={<Bug size={16} />} />
        <KPICard title="Exploited in the Wild" value={String(exploitable)} subtitle="Active exploitation observed" accentColor={TOKENS.sevHigh} icon={<Bug size={16} />} />
        <KPICard title="Patch Data Known" value={`${patchDataPct}%`} subtitle={`${patchDataKnown}/${vulns?.length ?? 0} findings assessed`} accentColor={TOKENS.success} icon={<Bug size={16} />} />
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
      </>}

      {tab === 'global' && <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div className="card-title">Worldwide CVEs published by NVD</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Intelligence feed only — CVEs are not counted as organizational risk until mapped by a scanner or SBOM.
            </div>
          </div>
          <select value={globalDays} onChange={(event) => { setGlobalDays(Number(event.target.value)); setGlobalPageNumber(1); }}>
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={120}>Last 120 days</option>
          </select>
        </div>
        {globalError ? (
          <div style={{ color: 'var(--sev-critical)' }}>NVD feed unavailable: {globalError}</div>
        ) : !globalPage ? (
          <SkeletonTable rows={8} cols={7} />
        ) : (
          <>
            <div style={{ marginBottom: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {globalPage.total_results.toLocaleString()} CVEs · Source: {globalPage.source} · fetched {new Date(globalPage.fetched_at).toLocaleString()}
            </div>
            <DataTable columns={globalColumns} rows={globalPage.items} getRowId={(v) => v.cve} defaultSortKey="published" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn-secondary" disabled={globalPageNumber === 1} onClick={() => setGlobalPageNumber((page) => page - 1)}>Previous</button>
              <span style={{ alignSelf: 'center', fontSize: '0.75rem' }}>Page {globalPageNumber}</span>
              <button className="btn-secondary" disabled={globalPage.start_index + globalPage.items.length >= globalPage.total_results} onClick={() => setGlobalPageNumber((page) => page + 1)}>Next</button>
            </div>
          </>
        )}
      </div>}
    </div>
  );
}
