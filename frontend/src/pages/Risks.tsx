import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import RiskScoreBadge from '../components/common/RiskScoreBadge';
import SourcePill from '../components/common/SourcePill';
import { getRisks } from '../services/api';
import { MOCK_RISKS } from '../utils/mock';
import { formatLakh, riskColor } from '../utils/format';

type Filter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function bucketOf(score: number): Filter {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export default function Risks() {
  const [risks, setRisks] = useState<any[]>(MOCK_RISKS);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getRisks().then((r) => {
      if (r?.data) setRisks(r.data);
    });
  }, []);

  const sorted = useMemo(() => [...risks].sort((a, b) => b.eal_inr - a.eal_inr), [risks]);
  const filtered = filter === 'ALL' ? sorted : sorted.filter((r) => bucketOf(r.risk_score) === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Risk Case Explorer</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Correlated, business-quantified risk cases sorted by financial exposure
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="chip"
              style={{
                borderColor: filter === f ? 'var(--accent-blue)' : 'var(--bg-border)',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                background: filter === f ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((r) => {
          const expanded = expandedId === r.asset_id;
          return (
            <div key={r.asset_id} className="card">
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1.5fr', gap: 24, alignItems: 'flex-start' }}>
                {/* Left */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <RiskScoreBadge score={r.risk_score} size={56} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text-primary)' }}>{r.asset_name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{r.business_service}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {(r.sources ?? []).map((s: string) => (
                        <SourcePill key={s} source={s} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center */}
                <div>
                  <div style={{ fontSize: '1.875rem', fontWeight: 800, color: riskColor(r.risk_score) }}>{formatLakh(r.eal_lakh)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>Expected Annual Loss</div>
                  <div style={{ display: 'flex', gap: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>
                      Likelihood: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(r.likelihood * 100)}%</strong>
                    </span>
                    <span>
                      Controls: <strong style={{ color: 'var(--text-primary)' }}>{r.control_effectiveness_pct}%</strong>
                    </span>
                  </div>
                </div>

                {/* Right — Risk Drivers */}
                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Risk Drivers
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {r.risk_drivers.slice(0, 3).map((d: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                        {d.direction === 'up' ? (
                          <ArrowUp size={12} color="var(--sev-critical)" />
                        ) : (
                          <ArrowDown size={12} color="var(--sev-low)" />
                        )}
                        <span style={{ color: d.direction === 'up' ? 'var(--sev-critical)' : 'var(--sev-low)', fontWeight: 700 }}>
                          {d.points > 0 ? '+' : ''}
                          {d.points}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>{d.factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpandedId(expanded ? null : r.asset_id)}
                style={{
                  marginTop: 14,
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                Why? {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {expanded && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--bg-border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {r.risk_drivers.map((d: any, i: number) => {
                    const width = Math.min(100, Math.abs(d.points) * 4);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 220, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{d.factor}</div>
                        <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${width}%`,
                              height: '100%',
                              background: d.direction === 'up' ? 'var(--sev-critical)' : 'var(--sev-low)',
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <div style={{ width: 40, textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: d.direction === 'up' ? 'var(--sev-critical)' : 'var(--sev-low)' }}>
                          {d.points > 0 ? '+' : ''}
                          {d.points}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
