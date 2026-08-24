import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import RiskScoreBadge from '../components/common/RiskScoreBadge';
import SourcePill from '../components/common/SourcePill';
import RiskCaseDrawer from '../components/riskcases/RiskCaseDrawer';
import { getRiskCases } from '../lib/api';
import { formatLakh, riskColor } from '../utils/format';
import { activateOnEnter } from '../utils/a11y';
import type { RiskCase } from '../types';
import { SkeletonCard } from '../components/common/Skeleton';

type Filter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

function bucketOf(score: number): Filter {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export default function Risks() {
  const [risks, setRisks] = useState<RiskCase[] | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [activeCase, setActiveCase] = useState<RiskCase | null>(null);

  useEffect(() => {
    getRiskCases().then(setRisks);
  }, []);

  const sorted = useMemo(() => (risks ? [...risks].sort((a, b) => b.eal_inr - a.eal_inr) : []), [risks]);
  const filtered = filter === 'ALL' ? sorted : sorted.filter((r) => bucketOf(r.risk_score) === filter);

  return (
    <div className="page-container page-stack">
      <div className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Risk Case Explorer</h1>
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
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!risks &&
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}

        {risks &&
          filtered.map((r) => (
            <div
              key={r.asset_id}
              className="card"
              role="button"
              tabIndex={0}
              onClick={() => setActiveCase(r)}
              onKeyDown={activateOnEnter(() => setActiveCase(r))}
              style={{ cursor: 'pointer' }}
            >
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
                    Top Risk Drivers
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {r.risk_drivers.slice(0, 3).map((d, i) => (
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
            </div>
          ))}

        {risks && filtered.length === 0 && (
          <div className="card">
            <div className="empty-state">No risk cases match the selected filter.</div>
          </div>
        )}
      </div>

      <RiskCaseDrawer riskCase={activeCase} open={!!activeCase} onClose={() => setActiveCase(null)} />
    </div>
  );
}
