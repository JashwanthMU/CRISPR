import { useEffect, useMemo, useState } from 'react';
import { Radar } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import { MOCK_FINDINGS } from '../utils/mock';
import { getFindings } from '../services/api';
import { TOKENS } from '../utils/format';

const FALLBACK_THREAT_FINDINGS = MOCK_FINDINGS.filter((f) => f.source_type === 'THREAT_INTEL');

const THREAT_ACTORS = [
  { name: 'APT-Nexus (financially motivated)', targets: 'APAC payment infrastructure', confidence: 'High', lastActivity: '2026-08-20' },
  { name: 'ShadowLoader ransomware group', targets: 'Financial services databases', confidence: 'Medium', lastActivity: '2026-08-14' },
  { name: 'CredStuffer collective', targets: 'Authentication endpoints', confidence: 'Medium', lastActivity: '2026-08-05' },
];

export default function ThreatIntelligence() {
  const [search, setSearch] = useState('');
  const [threatFindings, setThreatFindings] = useState<any[]>(FALLBACK_THREAT_FINDINGS);

  useEffect(() => {
    getFindings().then((response) => {
      if (response?.data) setThreatFindings(response.data.filter((finding: any) => finding.source_type === 'THREAT_INTEL'));
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
        <KPICard title="Tracked Threat Actors" value={String(THREAT_ACTORS.length)} accentColor={TOKENS.critical} icon={<Radar size={16} />} />
        <KPICard title="Active Campaigns" value="2" accentColor={TOKENS.sevHigh} icon={<Radar size={16} />} />
        <KPICard title="Actively Exploited CVEs" value="2" accentColor={TOKENS.critical} icon={<Radar size={16} />} />
        <KPICard title="Intel Feeds Connected" value="1 / 2" accentColor={TOKENS.secondaryBlue} icon={<Radar size={16} />} />
      </div>

      <div className="card">
        <div className="card-title">Threat Actors Targeting NovaPay</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Threat Actor</th>
              <th>Targets</th>
              <th>Confidence</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {THREAT_ACTORS.map((a) => (
              <tr key={a.name}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{a.targets}</td>
                <td>{a.confidence}</td>
                <td style={{ color: 'var(--text-muted)' }}>{a.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search threat intelligence..." />
        <DataTable columns={columns} rows={filtered} getRowId={(f) => f.finding_id} defaultSortKey="severity" />
      </div>
    </div>
  );
}
