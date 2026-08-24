import { useEffect, useMemo, useState } from 'react';
import { Globe, Lock, AlertTriangle } from 'lucide-react';
import RiskScoreBadge from '../components/common/RiskScoreBadge';
import ProgressBar from '../components/common/ProgressBar';
import SeverityBadge from '../components/common/SeverityBadge';
import FilterBar from '../components/common/FilterBar';
import { getAssets, getRisks, getFindings } from '../services/api';
import { MOCK_ASSETS, MOCK_RISKS, MOCK_FINDINGS } from '../utils/mock';
import { formatRupees, riskColor, TOKENS } from '../utils/format';

const TYPE_LABELS: Record<string, string> = {
  api_gateway: 'API Gateway',
  database: 'Database',
  web_app: 'Web App',
  server: 'Server',
};

export default function Assets() {
  const [assets, setAssets] = useState<any[]>(MOCK_ASSETS);
  const [risks, setRisks] = useState<any[]>(MOCK_RISKS);
  const [findings, setFindings] = useState<any[]>(MOCK_FINDINGS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [exposureFilter, setExposureFilter] = useState('all');

  useEffect(() => {
    Promise.all([getAssets(), getRisks(), getFindings()]).then(([a, r, f]) => {
      if (a?.data) setAssets(a.data);
      if (r?.data) setRisks(r.data);
      if (f?.data) setFindings(f.data);
    });
  }, []);

  const riskFor = (assetId: string) => risks.find((r) => r.asset_id === assetId);
  const findingsFor = (assetId: string) => findings.filter((f) => f.asset_id === assetId);

  const filteredAssets = useMemo(
    () =>
      assets.filter((a) => {
        if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (typeFilter !== 'all' && a.type !== typeFilter) return false;
        if (exposureFilter === 'internet' && !a.internet_facing) return false;
        if (exposureFilter === 'internal' && a.internet_facing) return false;
        return true;
      }),
    [assets, search, typeFilter, exposureFilter]
  );

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title">Asset Inventory</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Business-context-enriched inventory of NovaPay's critical assets
        </p>
      </div>

      <div className="card">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search assets..."
          selects={[
            {
              key: 'type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [
                { value: 'all', label: 'All Types' },
                { value: 'api_gateway', label: 'API Gateway' },
                { value: 'database', label: 'Database' },
                { value: 'web_app', label: 'Web App' },
                { value: 'server', label: 'Server' },
              ],
            },
            {
              key: 'exposure',
              value: exposureFilter,
              onChange: setExposureFilter,
              options: [
                { value: 'all', label: 'All Exposure' },
                { value: 'internet', label: 'Internet-facing' },
                { value: 'internal', label: 'Internal only' },
              ],
            },
          ]}
          right={<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredAssets.length} of {assets.length} assets</span>}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {filteredAssets.length === 0 && (
          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div className="empty-state">No assets match the current filters.</div>
          </div>
        )}
        {filteredAssets.map((a) => {
          const risk = riskFor(a.asset_id);
          const expanded = expandedId === a.asset_id;
          const isTestServer = a.asset_id === 'A006';
          return (
            <div key={a.asset_id} className="card" style={{ gridColumn: expanded ? 'span 3' : 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{a.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--color-light-blue)',
                        color: 'var(--color-primary-blue)',
                      }}
                    >
                      {TYPE_LABELS[a.type] ?? a.type}
                    </span>
                    {a.internet_facing && (
                      <span title="Internet-facing">
                        <Globe size={12} color="var(--text-muted)" />
                      </span>
                    )}
                    {a.is_regulated && (
                      <span title="Regulated">
                        <Lock size={12} color="var(--text-muted)" />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{a.business_service}</div>
                </div>
                {risk && <RiskScoreBadge score={risk.risk_score} size={44} />}
              </div>

              {isTestServer && (
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    fontSize: '0.75rem',
                    color: 'var(--color-warning)',
                    background: 'var(--color-warning-surface)',
                    padding: '8px 10px',
                    borderRadius: 6,
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <strong>High CVSS, Low Business Risk</strong> — CVSS 9.8 finding present, but business criticality is only{' '}
                    {a.business_criticality}/100. CRISPR prevents false priority.
                  </span>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <ProgressBar value={a.business_criticality} color={riskColor(a.business_criticality)} label="Business Criticality" />
              </div>
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={a.control_effectiveness} color={TOKENS.secondaryBlue} label="Control Effectiveness" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  EAL: <strong style={{ color: 'var(--text-primary)' }}>{risk ? formatRupees(risk.eal_inr) : '—'}</strong>
                </span>
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.6875rem' }} onClick={() => setExpandedId(expanded ? null : a.asset_id)}>
                  {expanded ? 'Hide Details' : 'View Risk'}
                </button>
              </div>

              {expanded && (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--color-divider)', paddingTop: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div className="card-title">Asset Details</div>
                      <table className="data-table">
                        <tbody>
                          <tr>
                            <td>Business Unit</td>
                            <td>{a.business_unit}</td>
                          </tr>
                          <tr>
                            <td>Business Service</td>
                            <td>{a.business_service}</td>
                          </tr>
                          <tr>
                            <td>Asset Value</td>
                            <td>{formatRupees(a.value_inr)}</td>
                          </tr>
                          <tr>
                            <td>Internet-Facing</td>
                            <td>{a.internet_facing ? 'Yes' : 'No'}</td>
                          </tr>
                          <tr>
                            <td>Regulated</td>
                            <td>{a.is_regulated ? 'Yes' : 'No'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <div className="card-title">Control Posture</div>
                      {a.controls && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <ProgressBar value={a.controls.mfa_pct} label="MFA Coverage" color={TOKENS.primaryBlue} />
                          <ProgressBar value={a.controls.edr_pct} label="EDR Coverage" color={TOKENS.secondaryBlue} />
                          <ProgressBar value={a.controls.patching_pct} label="Patching" color={TOKENS.primaryDark} />
                          <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>
                              WAF:{' '}
                              <strong style={{ color: a.controls.waf ? 'var(--sev-low)' : 'var(--sev-critical)' }}>
                                {a.controls.waf ? 'Enabled' : 'Absent'}
                              </strong>
                            </span>
                            <span>
                              Segmentation:{' '}
                              <strong style={{ color: a.controls.segmentation ? 'var(--sev-low)' : 'var(--sev-critical)' }}>
                                {a.controls.segmentation ? 'Enabled' : 'Absent'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <div className="card-title">Findings for this Asset</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Title</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {findingsFor(a.asset_id).length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ color: 'var(--text-muted)' }}>
                              No findings recorded for this asset.
                            </td>
                          </tr>
                        )}
                        {findingsFor(a.asset_id).map((f) => (
                          <tr key={f.finding_id}>
                            <td>
                              <SeverityBadge severity={f.severity} />
                            </td>
                            <td>{f.title}</td>
                            <td>{f.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
