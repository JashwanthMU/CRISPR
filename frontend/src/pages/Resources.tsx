import { useMemo, useState } from 'react';
import { Boxes } from 'lucide-react';
import DataTable, { ColumnDef } from '../components/common/DataTable';
import FilterBar from '../components/common/FilterBar';
import { MOCK_ASSETS } from '../utils/mock';
import { ASSET_TYPE_ICON } from '../config/icons';
import { formatRupees, riskColor } from '../utils/format';
import ProgressBar from '../components/common/ProgressBar';

interface Resource {
  asset_id: string;
  name: string;
  type: string;
  environment: string;
  owner: string;
  risk: number;
  criticality: number;
  exposure: string;
  lastObserved: string;
}

const RESOURCES: Resource[] = MOCK_ASSETS.map((a) => ({
  asset_id: a.asset_id,
  name: a.name,
  type: a.type,
  environment: a.business_unit === 'Engineering' && a.asset_id === 'A006' ? 'development' : 'production',
  owner: a.business_unit,
  risk: a.business_criticality,
  criticality: a.business_criticality,
  exposure: a.internet_facing ? 'Internet-facing' : 'Internal',
  lastObserved: '2026-08-24',
}));

export default function Resources() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');

  const filtered = useMemo(
    () =>
      RESOURCES.filter((r) => {
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (envFilter !== 'all' && r.environment !== envFilter) return false;
        return true;
      }),
    [search, typeFilter, envFilter]
  );

  const columns: ColumnDef<Resource>[] = [
    {
      key: 'name',
      header: 'Resource',
      sortValue: (r) => r.name,
      render: (r) => {
        const Icon = ASSET_TYPE_ICON[r.type] ?? Boxes;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <Icon size={14} color="var(--accent-cyan)" />
            {r.name}
          </span>
        );
      },
    },
    { key: 'type', header: 'Type', sortValue: (r) => r.type, render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.type.replace(/_/g, ' ')}</span> },
    { key: 'environment', header: 'Environment', sortValue: (r) => r.environment, render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.environment}</span> },
    { key: 'owner', header: 'Owner', sortValue: (r) => r.owner, render: (r) => r.owner },
    {
      key: 'risk',
      header: 'Risk',
      sortValue: (r) => r.risk,
      render: (r) => <ProgressBar value={r.risk} color={riskColor(r.risk)} showValue height={5} />,
      width: '140px',
    },
    { key: 'exposure', header: 'Exposure', sortValue: (r) => r.exposure, render: (r) => r.exposure },
    { key: 'lastObserved', header: 'Last Observed', sortValue: (r) => r.lastObserved, render: (r) => <span style={{ color: 'var(--text-muted)' }}>{r.lastObserved}</span> },
  ];

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Boxes size={22} color="var(--color-primary-blue)" /> Resource Inventory
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Unified inventory across APIs, databases, containers, repositories, identities, and cloud resources
        </p>
      </div>

      <div className="card">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search resources..."
          selects={[
            {
              key: 'type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { value: 'all', label: 'All Types' },
                { value: 'api_gateway', label: 'API' },
                { value: 'database', label: 'Database' },
                { value: 'web_app', label: 'Application' },
                { value: 'server', label: 'Server' },
              ],
            },
            {
              key: 'env',
              value: envFilter,
              onChange: setEnvFilter,
              options: [
                { value: 'all', label: 'All Environments' },
                { value: 'production', label: 'Production' },
                { value: 'development', label: 'Development' },
              ],
            },
          ]}
          right={<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{RESOURCES.length} total resources</span>}
        />
        <DataTable columns={columns} rows={filtered} getRowId={(r) => r.asset_id} defaultSortKey="risk" pageSize={10} />
      </div>
    </div>
  );
}
