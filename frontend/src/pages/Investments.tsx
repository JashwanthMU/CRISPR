import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { optimize } from '../services/api';
import { MOCK_CONTROLS, MOCK_OPTIMIZE_RESULT } from '../utils/mock';
import { formatRupees, TOKENS } from '../utils/format';

export default function Investments() {
  const [budgetLakh, setBudgetLakh] = useState(100); // ₹100L default
  const [result, setResult] = useState<any>(MOCK_OPTIMIZE_RESULT);
  const [optimizing, setOptimizing] = useState(false);

  const budgetInr = budgetLakh * 100000;

  const runOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await optimize(budgetInr);
      setResult(res?.data || { ...MOCK_OPTIMIZE_RESULT, budget_inr: budgetInr });
    } catch {
      setResult({ ...MOCK_OPTIMIZE_RESULT, budget_inr: budgetInr });
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    setResult(MOCK_OPTIMIZE_RESULT);
  }, []);

  const selectedNames = new Set((result?.selected_controls ?? []).map((c: any) => c.name));
  const chartData = (result?.selected_controls ?? []).map((c: any) => ({ name: c.name, value: c.risk_reduction_inr }));

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title">Where should your next security rupee go?</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          NovaPay Investment Optimizer · Maximize risk reduction per rupee spent
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Budget: ₹{budgetLakh}L
            </label>
            <input
              type="range"
              min={10}
              max={200}
              value={budgetLakh}
              onChange={(e) => setBudgetLakh(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <input
            type="number"
            className="input-field"
            style={{ width: 120 }}
            value={budgetLakh}
            onChange={(e) => setBudgetLakh(Number(e.target.value))}
          />
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
                Optimal ₹{budgetLakh}L Portfolio → {formatRupees(result.total_risk_reduction_inr)} Risk Reduction
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
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
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CONTROLS.map((c) => {
              const selected = selectedNames.has(c.name);
              return (
                <tr key={c.name} style={{ opacity: selected ? 1 : 0.45 }}>
                  <td>{c.name}</td>
                  <td>{formatRupees(c.cost_inr)}</td>
                  <td>{formatRupees(c.risk_reduction_inr)}</td>
                  <td>{c.complexity}</td>
                  <td>{c.weeks}w</td>
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
