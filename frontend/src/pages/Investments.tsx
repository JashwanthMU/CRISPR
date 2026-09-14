import { useLanguage } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getControls, optimize } from '../services/api';
import { MOCK_CONTROLS, MOCK_OPTIMIZE_RESULT } from '../utils/mock';
import { formatRupees, TOKENS } from '../utils/format';
import { API_MODE } from '../lib/api';

export default function Investments() {
  const { t } = useLanguage();
  const [budgetLakh, setBudgetLakh] = useState(100); // ₹100L default
  const [result, setResult] = useState<any>(API_MODE === 'demo' ? MOCK_OPTIMIZE_RESULT : null);
  const [controls, setControls] = useState<any[]>(API_MODE === 'demo' ? MOCK_CONTROLS : []);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState('');

  const budgetInr = budgetLakh * 100000;
  const setBoundedBudgetLakh = (value: number) => {
    if (!Number.isFinite(value)) return;
    setBudgetLakh(Math.min(200, Math.max(10, Math.round(value))));
  };

  const runOptimize = async () => {
    setOptimizing(true);
    setError('');
    try {
      const res = await optimize(budgetInr);
      if (!res?.data) throw new Error('Backend returned no optimization result');
      setResult(res.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? requestError.message);
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    Promise.all([optimize(budgetInr), getControls()]).then(([optimization, catalogue]) => {
      if (optimization?.data) setResult(optimization.data);
      if (catalogue?.data) setControls(catalogue.data);
    }).catch((requestError) => setError(requestError?.response?.data?.detail ?? requestError.message));
  }, []);

  const selectedNames = new Set((result?.selected_controls ?? []).map((c: any) => c.name));
  const chartData = (result?.selected_controls ?? []).map((c: any) => ({ name: c.name, value: c.risk_reduction_inr }));

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title">{t("Where should your next security rupee go?")}</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          CRISPR Investment Optimizer · Maximize risk reduction per rupee spent
        </p>
      </div>
      {error && <div className="card empty-state">Live optimization unavailable: {error}</div>}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Budget: {formatRupees(budgetInr)} <span style={{ color: 'var(--color-text-secondary)' }}>(₹10 lakh–₹2 crore)</span>
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={budgetLakh}
              step={5}
              onChange={(e) => setBoundedBudgetLakh(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Budget (₹ lakh)
            <input
              type="number"
              className="input-field"
              style={{ width: 96 }}
              min={10}
              max={200}
              step={5}
              value={budgetLakh}
              onChange={(e) => setBoundedBudgetLakh(Number(e.target.value))}
              aria-label="Investment budget in lakh rupees"
            />
          </label>
          <button className="btn-primary" onClick={runOptimize} disabled={optimizing}>
            {optimizing ? 'Optimizing…' : 'OPTIMIZE NOW'}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                Optimal {formatRupees(result.budget_inr ?? budgetInr)} Portfolio → {formatRupees(result.total_risk_reduction_inr)} Risk Reduction
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Spend {formatRupees(result.total_spend_inr)} · Unused budget {formatRupees(result.unused_budget_inr)}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: 9999,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-success)',
                color: 'var(--color-success)',
              }}
            >
              ROSI {(result.rosi_pct / 100).toFixed(1)}x
            </span>
          </div>

          <div className="dashboard-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-title">Selected Controls</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Control</th>
                    <th>Cost</th>
                    <th>Risk Reduction</th>
                    <th>Complexity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.selected_controls ?? []).map((c: any) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td>{formatRupees(c.cost_inr)}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 500 }}>{formatRupees(c.risk_reduction_inr)}</td>
                      <td>{c.complexity}</td>
                      <td>{c.weeks}w</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="card-title">Risk Reduction by Control</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.divider} horizontal={false} />
                  <XAxis type="number" tick={{ fill: TOKENS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatRupees(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: TOKENS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }}
                    formatter={(value: number) => [formatRupees(value), 'Risk Reduction']}
                  />
                  <Bar dataKey="value" fill={TOKENS.success} radius={[0, 4, 4, 0]} isAnimationActive animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="card-title">All Available Controls</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Control</th>
              <th>Cost</th>
              <th>Risk Reduction</th>
              <th>Complexity</th>
              <th>Time</th>
              <th>{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => {
              const selected = selectedNames.has(c.name);
              return (
                <tr key={c.name} style={{ opacity: selected ? 1 : 0.45 }}>
                  <td>{c.name}</td>
                  <td>{formatRupees(c.cost_inr)}</td>
                  <td>{formatRupees(c.risk_reduction_inr)}</td>
                  <td>{c.complexity}</td>
                  <td>{c.time_weeks ?? c.weeks}w</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: selected ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}
                    >
                      {selected ? 'SELECTED' : 'Not selected'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
