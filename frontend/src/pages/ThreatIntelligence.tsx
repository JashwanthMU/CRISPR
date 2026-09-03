import { useEffect, useMemo, useState } from 'react';
import { Radar } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { API_MODE, getThreatIntel } from '../lib/api';
import { TOKENS } from '../utils/format';

export default function ThreatIntelligence() {
  const [search, setSearch] = useState('');
  const [threatFindings, setThreatFindings] = useState<any[]>([]);
  const [sourceCount, setSourceCount] = useState(0);

  useEffect(() => {
    getThreatIntel().then((response: any) => {
      setThreatFindings(Array.isArray(response?.observations) ? response.observations : []);
      setSourceCount(Number(response?.source_count ?? 0));
    }).catch(() => {
      setThreatFindings([]);
      setSourceCount(0);
    });
  }, []);

  const filtered = useMemo(
    () => threatFindings.filter((f) => !search || f.title.toLowerCase().includes(search.toLowerCase())),
    [search, threatFindings]
  );

  const columns: ColumnDef<any>[] = [
    { key: 'severity', header: 'Severity', sortValue: (f) => f.severity, render: (f) => <SeverityBadge severity={f.severity} /> },
    { key: 'title', header: 'Intelligence', sortValue: (f) => f.title, render: (f) => f.title },
    { key: 'asset_id', header: 'Related Asset', sortValue: (f) => f.asset_id, render: (f) => f.asset_id },
    { key: 'source_name', header: 'Source', sortValue: (f) => f.source_name, render: (f) => f.source_name },
    { key: 'confidence', header: 'Confidence', sortValue: (f) => f.confidence, render: (f) => `${Math.round(f.confidence * 100)}%` },
    { key: 'first_seen', header: 'First Seen', sortValue: (f) => f.first_seen, render: (f) => <span style={{ color: 'var(--text-muted)' }}>{f.first_seen}</span> },
  ];

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Radar size={22} color="var(--color-primary-blue)" /> Threat Intelligence
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Active threat actor tracking and campaign correlation from MISP feeds
        </p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Threat Observations" value={String(threatFindings.length)} accentColor={TOKENS.critical} icon={<Radar size={16} />} />
        <KPICard title="Critical Observations" value={String(threatFindings.filter((row) => row.severity === 'CRITICAL').length)} accentColor={TOKENS.sevHigh} icon={<Radar size={16} />} />
        <KPICard title="Actively Exploited CVEs" value={String(threatFindings.filter((row) => row.exploited_in_wild === true).length)} accentColor={TOKENS.critical} icon={<Radar size={16} />} />
        <KPICard title="Live Intel Sources" value={String(sourceCount)} accentColor={TOKENS.secondaryBlue} icon={<Radar size={16} />} />
      </div>

      <div className="card">
        {API_MODE === 'live' && threatFindings.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No live threat-intelligence observations have been ingested.</p>
        )}
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search threat intelligence..." />
        <DataTable columns={columns} rows={filtered} getRowId={(f) => f.finding_id} defaultSortKey="severity" />
      </div>
    </div>
  );
}
