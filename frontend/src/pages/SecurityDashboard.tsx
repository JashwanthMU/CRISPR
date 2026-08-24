import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, AlertTriangle, Radio, Target } from 'lucide-react';
import KPICard from '../components/common/KPICard';
import SeverityBadge from '../components/common/SeverityBadge';
import RiskScoreBadge from '../components/common/RiskScoreBadge';
import ProgressBar from '../components/common/ProgressBar';
import SourceStatusDot from '../components/common/SourceStatusDot';
import SourcePill from '../components/common/SourcePill';
import RiskDonut from '../components/charts/RiskDonut';
import RiskTrendChart from '../components/charts/RiskTrendChart';
import AIAdvisorChat from '../components/common/AIAdvisorChat';
import { getEnterprise, getRisks, getSources, getFindings } from '../services/api';
import { MOCK_ENTERPRISE, MOCK_RISKS, MOCK_SOURCES, MOCK_TREND, MOCK_FINDINGS } from '../utils/mock';
import { formatLakh, sourceColor, sourceLabel } from '../utils/format';

const SECURITY_SUGGESTIONS = [
  'What is our top security risk?',
  'Why is Auth API high risk?',
  'Which CVEs are exploited in the wild?',
  'What if we implement MFA?',
];

export default function SecurityDashboard() {
  const [enterprise, setEnterprise] = useState<any>(MOCK_ENTERPRISE);
  const [risks, setRisks] = useState<any[]>(MOCK_RISKS);
  const [sources, setSources] = useState<any[]>(MOCK_SOURCES);
  const [findings, setFindings] = useState<any[]>(MOCK_FINDINGS);
  const [usingDemo, setUsingDemo] = useState({ enterprise: false, risks: false, sources: false, findings: false });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    Promise.all([getEnterprise(), getRisks(), getSources(), getFindings()])
      .then(([e, r, s, f]) => {
        if (e?.data) setEnterprise(e.data);
        else setUsingDemo((u) => ({ ...u, enterprise: true }));
        if (r?.data) setRisks(r.data);
        else setUsingDemo((u) => ({ ...u, risks: true }));
        if (s?.data) setSources(s.data);
        else setUsingDemo((u) => ({ ...u, sources: true }));
        if (f?.data) setFindings(f.data);
        else setUsingDemo((u) => ({ ...u, findings: true }));
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedRisks = useMemo(() => [...risks].sort((a, b) => b.risk_score - a.risk_score), [risks]);

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const connectedCount = sources.filter((s) => s.status === 'connected').length;
  const topRisk = sortedRisks[0];

  const filteredFindings = findings.filter((f) => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.finding_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (sevFilter !== 'ALL' && f.severity !== sevFilter) return false;
    if (sourceFilter !== 'ALL' && f.source_type !== sourceFilter) return false;
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Security Operations Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          NovaPay Financial Services · Real-time threat intelligence
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard
          title="Enterprise Risk Score"
          value={`${enterprise.enterprise_risk_score} / 100`}
          subtitle="↑ 3pts this month"
          trend={3}
          trendDirection="up"
          icon={<ShieldAlert size={16} />}
          accentColor="#ef4444"
          demo={usingDemo.enterprise}
        />
        <KPICard
          title="Active Findings"
          value={`${findings.length}`}
          subtitle={`${criticalCount} CRITICAL · ${highCount} HIGH`}
          icon={<AlertTriangle size={16} />}
          accentColor="#f97316"
          demo={usingDemo.findings}
        />
        <KPICard
          title="Sources Connected"
          value={`${connectedCount} / ${sources.length}`}
          subtitle={`${sources.length - connectedCount} pending integration`}
          icon={<Radio size={16} />}
          accentColor="#2563eb"
          demo={usingDemo.sources}
        />
        <KPICard
          title="Top Asset at Risk"
          value={topRisk?.asset_name?.split(' ').slice(0, 2).join(' ') ?? '—'}
          subtitle={`Risk score ${topRisk?.risk_score} · ${formatLakh(topRisk?.eal_lakh)} EAL`}
          icon={<Target size={16} />}
          accentColor="#ef4444"
          demo={usingDemo.risks}
        />
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 0.7fr', gap: 16 }}>
        {/* Active Risk Cases */}
        <div className="card">
          <div className="card-title">Active Risk Cases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 460, overflowY: 'auto' }}>
            {sortedRisks.map((r) => (
              <div
                key={r.asset_id}
                style={{
                  border: '1px solid var(--bg-border)',
                  borderRadius: 8,
                  padding: 14,
                  background: 'var(--bg-elevated)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.asset_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.business_service}</div>
                  </div>
                  <RiskScoreBadge score={r.risk_score} size={40} />
                </div>
                <div style={{ margin: '10px 0' }}>
                  <ProgressBar value={r.confidence_pct ?? 80} color="#06b6d4" label="Confidence" />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(r.sources ?? []).map((s: string) => (
                    <SourcePill key={s} source={s} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EAL: {formatLakh(r.eal_lakh)}</span>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.6875rem' }}>
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Findings by Source */}
        <div className="card">
          <div className="card-title">Findings by Source</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {sources.map((s) => (
              <div
                key={s.source}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-elevated)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sourceColor(s.source) }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{sourceLabel(s.source)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
                  <SourceStatusDot status={s.status} />
                </div>
              </div>
            ))}
          </div>
          <RiskDonut data={sources} height={200} />
        </div>

        {/* Risk Trend */}
        <div className="card">
          <div className="card-title">Risk Trend (6M)</div>
          <RiskTrendChart data={MOCK_TREND} height={200} />
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(239,68,68,0.12)',
              color: 'var(--sev-critical)',
              fontSize: '0.75rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            ↑ 61.5% increase since March — immediate action required
          </div>
        </div>
      </div>

      {/* Row 3: Findings Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>
            All Findings
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              placeholder="Search findings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <select className="input-field" value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select className="input-field" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="ALL">All Sources</option>
              {sources.map((s) => (
                <option key={s.source} value={s.source}>
                  {sourceLabel(s.source)}
                </option>
              ))}
            </select>
            <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="VALIDATED">Validated</option>
              <option value="TRIAGED">Triaged</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Finding ID</th>
                <th>Title</th>
                <th>Asset</th>
                <th>Source</th>
                <th>Confidence</th>
                <th>First Seen</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((f) => (
                <tr key={f.finding_id}>
                  <td>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{f.finding_id}</td>
                  <td>{f.title}</td>
                  <td>{f.asset_id}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: `${sourceColor(f.source_type)}20`,
                        color: sourceColor(f.source_type),
                      }}
                    >
                      {sourceLabel(f.source_type)}
                    </span>
                  </td>
                  <td style={{ width: 110 }}>
                    <ProgressBar value={Math.round(f.confidence * 100)} showValue={false} height={5} />
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{f.first_seen}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color:
                          f.status === 'OPEN' ? 'var(--sev-critical)' : f.status === 'VALIDATED' ? 'var(--sev-high)' : 'var(--sev-medium)',
                      }}
                    >
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredFindings.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                    No findings match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Advisor */}
      <AIAdvisorChat theme="security" suggestions={SECURITY_SUGGESTIONS} />
    </div>
  );
}
