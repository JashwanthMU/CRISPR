import { useState } from 'react';
import { CheckCircle2, Wrench, Lock, Clock } from 'lucide-react';
import { formatRupees } from '../utils/format';
import { MOCK_RISKS } from '../utils/mock';

interface SimResult {
  beforeEal: number;
  afterEal: number;
  beforeScore: number;
  afterScore: number;
  perAsset: { asset: string; before: number; after: number }[];
}

const PRESETS = [
  { key: 'mfa', label: 'Enable MFA', icon: <CheckCircle2 size={16} />, savings: 4860000, cost: 1500000, rosi: 224, negative: false },
  { key: 'patch', label: 'Patch Immediately', icon: <Wrench size={16} />, savings: 3100000, cost: 1200000, rosi: 158, negative: false },
  { key: 'segmentation', label: 'Add Segmentation', icon: <Lock size={16} />, savings: 3870000, cost: 3000000, rosi: null, negative: false },
  { key: 'delay', label: 'Delay Patching 30d', icon: <Clock size={16} />, savings: -2100000, cost: 0, rosi: null, negative: true },
];

const BASE_EAL_INR = 84000000;
const BASE_SCORE = 78;

export default function Scenarios() {
  const [mfa, setMfa] = useState(false);
  const [patching, setPatching] = useState<'immediate' | '30day' | '60day'>('immediate');
  const [segmentation, setSegmentation] = useState(false);
  const [edrCoverage, setEdrCoverage] = useState(60);
  const [result, setResult] = useState<SimResult | null>(null);

  const simulate = () => {
    let deltaInr = 0;
    if (mfa) deltaInr -= 4860000;
    if (segmentation) deltaInr -= 3870000;
    if (patching === '30day') deltaInr += 2100000;
    if (patching === '60day') deltaInr += 4200000;
    if (patching === 'immediate') deltaInr -= 3100000;
    deltaInr -= ((edrCoverage - 60) / 40) * 1800000;

    const afterEal = Math.max(3000000, BASE_EAL_INR + deltaInr);
    const scoreDelta = Math.round(((BASE_EAL_INR - afterEal) / BASE_EAL_INR) * 60);
    const afterScore = Math.max(15, Math.min(100, BASE_SCORE - scoreDelta));

    const ratio = afterEal / BASE_EAL_INR;
    const perAsset = MOCK_RISKS.map((r) => ({
      asset: r.asset_name,
      before: r.eal_inr,
      after: Math.round(r.eal_inr * ratio),
    }));

    setResult({ beforeEal: BASE_EAL_INR, afterEal, beforeScore: BASE_SCORE, afterScore, perAsset });
  };

  const applyPreset = (key: string) => {
    if (key === 'mfa') setMfa(true);
    if (key === 'patch') setPatching('immediate');
    if (key === 'segmentation') setSegmentation(true);
    if (key === 'delay') setPatching('30day');
    setTimeout(simulate, 0);
  };

  const diff = result ? result.afterEal - result.beforeEal : 0;
  const diffGood = diff < 0;

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title">What-If Scenario Simulator</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Model the financial impact of security investments before you make them
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        {/* Controls */}
        <div className="card">
          <div className="card-title">Controls</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Multi-Factor Authentication</span>
              <button
                onClick={() => setMfa(!mfa)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: mfa ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: mfa ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.15s ease',
                  }}
                />
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginBottom: 8 }}>Patching Cadence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(['immediate', '30day', '60day'] as const).map((p) => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="radio" name="patching" checked={patching === p} onChange={() => setPatching(p)} />
                    {p === 'immediate' ? 'Immediate patching' : p === '30day' ? '30-day delay' : '60-day delay'}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Network Segmentation</span>
              <button
                onClick={() => setSegmentation(!segmentation)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: segmentation ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  position: 'relative',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: segmentation ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.15s ease',
                  }}
                />
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>EDR Coverage</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{edrCoverage}%</span>
              </div>
              <input
                type="range"
                min={60}
                max={100}
                value={edrCoverage}
                onChange={(e) => setEdrCoverage(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <button className="btn-primary" onClick={simulate}>
              SIMULATE
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="card-title">Results</div>
          {result ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ padding: 16, borderRadius: 8, background: 'var(--bg-elevated)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Before EAL
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--sev-critical)' }}>{formatRupees(result.beforeEal)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Risk score {result.beforeScore}</div>
                </div>
                <div style={{ padding: 16, borderRadius: 8, background: 'var(--bg-elevated)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    After EAL
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: diffGood ? 'var(--sev-low)' : 'var(--sev-critical)' }}>
                    {formatRupees(result.afterEal)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Risk score {result.afterScore}</div>
                </div>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: diffGood ? 'var(--sev-low)' : 'var(--sev-critical)',
                  padding: '8px 0',
                  marginBottom: 16,
                }}
              >
                {diffGood ? '↓' : '↑'} {formatRupees(Math.abs(diff))} {diffGood ? 'reduction' : 'increase'}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Before EAL</th>
                    <th>After EAL</th>
                    <th>Δ</th>
                    <th>Δ%</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perAsset.map((p) => {
                    const d = p.after - p.before;
                    const pct = p.before ? Math.round((d / p.before) * 100) : 0;
                    return (
                      <tr key={p.asset}>
                        <td>{p.asset}</td>
                        <td>{formatRupees(p.before)}</td>
                        <td>{formatRupees(p.after)}</td>
                        <td style={{ color: d < 0 ? 'var(--sev-low)' : d > 0 ? 'var(--sev-critical)' : 'var(--text-muted)' }}>
                          {d < 0 ? '↓' : d > 0 ? '↑' : '—'} {formatRupees(Math.abs(d))}
                        </td>
                        <td style={{ color: d < 0 ? 'var(--sev-low)' : d > 0 ? 'var(--sev-critical)' : 'var(--text-muted)' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Configure controls on the left and click SIMULATE to see the projected impact.
            </div>
          )}
        </div>
      </div>

      {/* Presets */}
      <div className="card">
        <div className="card-title">Quick Presets</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {PRESETS.map((p) => (
            <div
              key={p.key}
              style={{
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                padding: 14,
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
              }}
              onClick={() => applyPreset(p.key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: p.negative ? 'var(--sev-critical)' : 'var(--accent-blue)' }}>
                {p.icon}
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{p.label}</span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: p.negative ? 'var(--sev-critical)' : 'var(--sev-low)' }}>
                {p.negative ? '↑ increases risk by ' : 'Saves '}
                {formatRupees(Math.abs(p.savings))}
              </div>
              {p.cost > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Costs {formatRupees(p.cost)}</div>
              )}
              {p.rosi && (
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sev-low)', marginTop: 6 }}>ROSI {p.rosi}%</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
