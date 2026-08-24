import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, TrendingUp, Wallet, Percent } from 'lucide-react';
import KPICard from '../components/common/KPICard';
import FinancialBreakdownBar from '../components/charts/FinancialBreakdownBar';
import AIAdvisorChat from '../components/common/AIAdvisorChat';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { getEnterprise, getRisks, getCompliance, optimize } from '../services/api';
import { MOCK_ENTERPRISE, MOCK_RISKS, MOCK_COMPLIANCE, MOCK_FORECAST, MOCK_ACTIONS, MOCK_OPTIMIZE_RESULT } from '../utils/mock';
import { formatRupees, formatLakh } from '../utils/format';

const FINANCIAL_SUGGESTIONS = [
  'What is our total financial cyber exposure?',
  'What should we do with ₹1 crore budget?',
  'What if we delay patching by 30 days?',
  'Which business service has highest exposure?',
];

const LOSS_LABELS: Record<string, string> = {
  downtime_loss: 'Business Downtime',
  ir_cost: 'Incident Response',
  recovery_cost: 'Recovery',
  data_breach_cost: 'Data Breach',
  regulatory_cost: 'Regulatory (RBI/DPDP)',
  reputation_cost: 'Reputation',
};

function complianceColor(score: number) {
  if (score < 75) return '#ef4444';
  if (score <= 85) return '#f97316';
  return '#22c55e';
}

export default function FinancialDashboard() {
  const [enterprise, setEnterprise] = useState<any>(MOCK_ENTERPRISE);
  const [risks, setRisks] = useState<any[]>(MOCK_RISKS);
  const [compliance, setCompliance] = useState<any[]>(MOCK_COMPLIANCE);
  const [usingDemo, setUsingDemo] = useState({ enterprise: false, risks: false, compliance: false });

  const [selectedAssetId, setSelectedAssetId] = useState('A003');
  const [budget, setBudget] = useState(10000000); // ₹100L default
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    Promise.all([getEnterprise(), getRisks(), getCompliance()]).then(([e, r, c]) => {
      if (e?.data) setEnterprise(e.data);
      else setUsingDemo((u) => ({ ...u, enterprise: true }));
      if (r?.data) setRisks(r.data);
      else setUsingDemo((u) => ({ ...u, risks: true }));
      if (c?.data) setCompliance(c.data);
      else setUsingDemo((u) => ({ ...u, compliance: true }));
    });
  }, []);

  const nonZeroRisks = useMemo(() => risks.filter((r) => r.eal_lakh > 0).sort((a, b) => b.eal_lakh - a.eal_lakh), [risks]);
  const barData = nonZeroRisks.map((r) => ({ name: r.asset_name, value: r.eal_inr, risk_score: r.risk_score }));

  const selectedAsset = risks.find((r) => r.asset_id === selectedAssetId) ?? risks[0];
  const lossData = selectedAsset
    ? Object.entries(selectedAsset.loss_breakdown)
        .filter(([k]) => k !== 'total_inr')
        .map(([k, v]) => ({ name: LOSS_LABELS[k] ?? k, value: v as number }))
    : [];

  const runOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await optimize(budget);
      setOptimizeResult(res?.data || { ...MOCK_OPTIMIZE_RESULT, budget_inr: budget });
    } catch {
      setOptimizeResult({ ...MOCK_OPTIMIZE_RESULT, budget_inr: budget });
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    // seed initial optimizer result with default ₹100L budget so the section isn't empty
    setOptimizeResult(MOCK_OPTIMIZE_RESULT);
  }, []);

  const currentSpend = enterprise.current_spend_inr ?? 2800000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Cyber Risk Financial Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Board-level financial exposure · NovaPay Financial Services
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard
          title="Expected Annual Loss"
          value={formatLakh(enterprise.total_eal_lakh)}
          subtitle="Total cyber exposure this year"
          icon={<IndianRupee size={16} />}
          accentColor="#ef4444"
          demo={usingDemo.enterprise}
        />
        <KPICard
          title="P95 Cyber VaR"
          value={formatRupees(enterprise.var_95_inr)}
          subtitle="Worst-case annual scenario"
          icon={<TrendingUp size={16} />}
          accentColor="#f97316"
          demo={usingDemo.enterprise}
        />
        <KPICard
          title="Current Security Spend"
          value={`${formatRupees(currentSpend)}/yr`}
          subtitle={`vs. ${formatLakh(enterprise.total_eal_lakh)} annual loss exposure`}
          icon={<Wallet size={16} />}
          accentColor="#2563eb"
          demo={usingDemo.enterprise}
        />
        <KPICard
          title="Optimal ROSI"
          value="980%"
          subtitle="Top action: Enable MFA"
          icon={<Percent size={16} />}
          accentColor="#22c55e"
        />
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Financial Risk by Asset</div>
          <FinancialBreakdownBar data={barData} height={260} />
          <div
            style={{
              marginTop: 8,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              padding: '8px 10px',
              borderRadius: 6,
              background: 'var(--bg-elevated)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Test Server</strong>: CVSS 9.8 — but isolated, non-revenue-generating, and
            unregulated → EAL only {formatLakh(0.3)}. High CVSS does not always mean high business risk.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Loss Breakdown — Top Risk</div>
          <div style={{ marginBottom: 10 }}>
            <select className="input-field" value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} style={{ width: '100%' }}>
              {risks.map((r) => (
                <option key={r.asset_id} value={r.asset_id}>
                  {r.asset_name}
                </option>
              ))}
            </select>
          </div>
          <FinancialBreakdownBar data={lossData} height={220} />
          {selectedAsset && (
            <div
              style={{
                marginTop: 10,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '8px 10px',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
              }}
            >
              EAL = {formatLakh(selectedAsset.eal_lakh)} ({Math.round(selectedAsset.likelihood * 100)}% annual likelihood ×{' '}
              {formatRupees(selectedAsset.loss_breakdown.total_inr)} potential impact)
            </div>
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Top Recommended Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MOCK_ACTIONS.map((a) => (
              <div key={a.name} style={{ border: '1px solid var(--bg-border)', borderRadius: 8, padding: 12, background: 'var(--bg-elevated)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 6 }}>{a.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 8 }}>
                  <span style={{ color: 'var(--accent-blue)' }}>Cost: {formatRupees(a.cost_inr)}</span>
                  <span style={{ color: 'var(--sev-low)', fontWeight: 700 }}>Saves {formatRupees(a.savings_inr)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'rgba(34,197,94,0.15)',
                      color: 'var(--sev-low)',
                    }}
                  >
                    ROSI {a.rosi_pct}%
                  </span>
                  <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.6875rem' }}>
                    Implement Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Compliance Financial Impact</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Framework</th>
                <th>Score</th>
                <th>Gap</th>
                <th>₹ Impact</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>RBI CSF</td>
                <td style={{ color: complianceColor(72), fontWeight: 700 }}>72%</td>
                <td>MFA gap</td>
                <td>{formatRupees(4860000)}</td>
              </tr>
              <tr>
                <td>ISO 27001</td>
                <td style={{ color: complianceColor(76), fontWeight: 700 }}>76%</td>
                <td>Segmentation</td>
                <td>{formatRupees(3870000)}</td>
              </tr>
              <tr>
                <td>NIST CSF</td>
                <td style={{ color: complianceColor(82), fontWeight: 700 }}>82%</td>
                <td>Patching</td>
                <td>{formatRupees(3100000)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {compliance.map((c) => (
              <div key={c.framework} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{c.framework.replace(/_/g, ' ')}</span>
                <span style={{ color: complianceColor(c.score), fontWeight: 700 }}>{c.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">90-Day Risk Forecast</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_FORECAST} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="day" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `D${v}`} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
              <Area type="monotone" dataKey="current" name="No action" stroke="#ef4444" fill="url(#colorCurrent)" strokeWidth={2} />
              <Area type="monotone" dataKey="withActions" name="With actions" stroke="#22c55e" fill="url(#colorActions)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Budget Optimizer */}
      <div className="card">
        <div className="card-title">Security Budget Optimizer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24 }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Annual Budget: {formatRupees(budget)}
            </label>
            <input
              type="range"
              min={1000000}
              max={20000000}
              step={500000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <input
              type="number"
              className="input-field"
              style={{ width: '100%', marginBottom: 12 }}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <button className="btn-primary" style={{ width: '100%' }} onClick={runOptimize} disabled={optimizing}>
              {optimizing ? 'Optimizing…' : 'OPTIMIZE'}
            </button>
          </div>
          <div>
            {optimizeResult ? (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Control</th>
                      <th>Cost</th>
                      <th>Risk Reduction</th>
                      <th>Complexity</th>
                      <th>Weeks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(optimizeResult.selected_controls ?? []).map((c: any) => (
                      <tr key={c.name}>
                        <td>{c.name}</td>
                        <td>{formatRupees(c.cost_inr)}</td>
                        <td style={{ color: 'var(--sev-low)', fontWeight: 700 }}>{formatRupees(c.risk_reduction_inr)}</td>
                        <td>{c.complexity}</td>
                        <td>{c.weeks}w</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Total spend: <strong style={{ color: 'var(--text-primary)' }}>{formatRupees(optimizeResult.total_spend_inr)}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Risk reduction:{' '}
                    <strong style={{ color: 'var(--sev-low)' }}>{formatRupees(optimizeResult.total_risk_reduction_inr)}</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ROSI: <strong style={{ color: 'var(--sev-low)' }}>{optimizeResult.rosi_pct}%</strong>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Unused: <strong style={{ color: 'var(--text-primary)' }}>{formatRupees(optimizeResult.unused_budget_inr)}</strong>
                  </span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Click OPTIMIZE to generate a recommended portfolio.</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Advisor */}
      <AIAdvisorChat theme="financial" suggestions={FINANCIAL_SUGGESTIONS} />
    </div>
  );
}
