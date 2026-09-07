import { useEffect, useState } from 'react';
import { CheckCircle2, BadgeIcon, Lock, Clock } from 'lucide-react';
import { formatRupees } from '../utils/format';
import { getPresets, getScenarios } from '../services/api';
import api from '../lib/api';

interface SimResult {
  beforeEal: number;
  afterEal: number;
  perAsset: { asset: string; before: number; after: number }[];
}

interface Preset {
  id: string;
  name: string;
  params: Record<string, boolean | number>;
  cost_inr: number;
  reduction_inr: number;
  rosi_pct: number | null;
}

interface DeliveryResult {
  forecast_days: number;
  additional_exposure_days: number;
  delay_attributable_loss_inr: number;
  risk_reduction_at_risk_inr: number;
  forecast_period_probability: number;
}

const iconForPreset = (id: string) => {
  if (id === 'mfa') return <CheckCircle2 size={16} />;
  if (id === 'patch_now') return <BadgeIcon size={16} />;
  if (id === 'segment') return <Lock size={16} />;
  return <Clock size={16} />;
};

export default function Scenarios() {
  const [mfa, setMfa] = useState(false);
  const [patching, setPatching] = useState<'immediate' | '30day' | '60day'>('immediate');
  const [segmentation, setSegmentation] = useState(false);
  const [edrCoverage, setEdrCoverage] = useState(60);
  const [result, setResult] = useState<SimResult | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [plannedDays, setPlannedDays] = useState(7);
  const [likelyDays, setLikelyDays] = useState(30);
  const [absenceDays, setAbsenceDays] = useState(0);
  const [availability, setAvailability] = useState(100);
  const [capability, setCapability] = useState('READY');
  const [backup, setBackup] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<DeliveryResult | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [annualProbabilityPct, setAnnualProbabilityPct] = useState(18);
  const [lossMagnitudeLakh, setLossMagnitudeLakh] = useState(200);
  const [potentialReductionLakh, setPotentialReductionLakh] = useState(31);
  const [deliveryError, setDeliveryError] = useState('');

  useEffect(() => {
    getPresets().then((response) => setPresets(response?.data ?? []));
  }, []);

  const runWithParams = async (params: Record<string, boolean | number>) => {
    setSimulating(true);
    const response = await getScenarios(params);
    const data = response?.data;
    if (data) {
      setResult({
        beforeEal: data.before_total_eal_inr,
        afterEal: data.after_total_eal_inr,
        perAsset: (data.per_asset ?? []).map((row: any) => ({
          asset: row.asset_name,
          before: row.before_eal_inr,
          after: row.after_eal_inr,
        })),
      });
    }
    setSimulating(false);
  };

  const simulate = () => {
    const params: Record<string, boolean | number> = {};
    if (mfa) params.implement_mfa = true;
    if (segmentation) params.implement_segmentation = true;
    if (patching === 'immediate') params.implement_patching = true;
    if (patching === '30day') params.patch_delay = 30;
    if (patching === '60day') params.patch_delay = 60;
    if (edrCoverage === 100) params.edr_expand = true;
    void runWithParams(params);
  };

  const applyPreset = (preset: Preset) => void runWithParams(preset.params);

  const simulateDelivery = async () => {
    setDeliveryLoading(true);
    setDeliveryError('');
    try {
      const { data } = await api.post('/api/scenarios/delivery-risk', {
        planned_days: plannedDays, likely_days: likelyDays, absence_days: absenceDays,
        availability_pct: availability, capability_status: capability, backup_available: backup,
        annual_incident_probability: annualProbabilityPct / 100,
        loss_magnitude_inr: lossMagnitudeLakh * 100_000,
        potential_risk_reduction_inr: potentialReductionLakh * 100_000,
        realized_risk_reduction_inr: 0,
      });
      setDeliveryResult(data);
    } catch (error: any) {
      setDeliveryError(error?.response?.data?.detail ?? error.message ?? 'Delivery-risk calculation failed');
    } finally { setDeliveryLoading(false); }
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

            <button className="btn-primary" onClick={simulate} disabled={simulating}>
              {simulating ? 'SIMULATING…' : 'SIMULATE'}
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
                </div>
                <div style={{ padding: 16, borderRadius: 8, background: 'var(--bg-elevated)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    After EAL
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: diffGood ? 'var(--sev-low)' : 'var(--sev-critical)' }}>
                    {formatRupees(result.afterEal)}
                  </div>
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
          {presets.map((p) => {
            const negative = p.reduction_inr < 0;
            return (
            <div
              key={p.id}
              style={{
                border: '1px solid var(--bg-border)',
                borderRadius: 8,
                padding: 14,
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
              }}
              onClick={() => applyPreset(p)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: negative ? 'var(--sev-critical)' : 'var(--accent-blue)' }}>
                {iconForPreset(p.id)}
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{p.name}</span>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: negative ? 'var(--sev-critical)' : 'var(--sev-low)' }}>
                {negative ? '↑ increases risk by ' : 'Saves '}
                {formatRupees(Math.abs(p.reduction_inr))}
              </div>
              {p.cost_inr > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Costs {formatRupees(p.cost_inr)}</div>
              )}
              {p.rosi_pct != null && (
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sev-low)', marginTop: 6 }}>ROSI {p.rosi_pct}%</div>
              )}
            </div>
          );})}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 4 }}>Remediation Delivery Risk</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 18px' }}>Model schedule overrun, staff availability, capability and backup coverage. This records operational capacity—not medical details.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(500px, 1.15fr) minmax(380px, 0.85fr)', gap: 24, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              {[
                ['Planned duration', 'days', plannedDays, setPlannedDays, 1, 730],
                ['Likely duration', 'days', likelyDays, setLikelyDays, 1, 730],
                ['Unexpected absence', 'days', absenceDays, setAbsenceDays, 0, 365],
                ['Availability', '%', availability, setAvailability, 1, 100],
                ['Annual incident probability', '%', annualProbabilityPct, setAnnualProbabilityPct, 0.01, 100],
                ['Loss magnitude', '₹ lakh', lossMagnitudeLakh, setLossMagnitudeLakh, 1, 100000],
                ['Potential risk reduction', '₹ lakh', potentialReductionLakh, setPotentialReductionLakh, 0, 100000],
              ].map(([label, unit, value, setter, min, max]) => <div key={String(label)}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{String(label)} ({String(unit)})</label>
                <input className="input-field" style={{ width: '100%' }} type="number" min={Number(min)} max={Number(max)} value={Number(value)} onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))} />
              </div>)}
              <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Capability</label><select className="input-field" style={{ width: '100%' }} value={capability} onChange={(e) => setCapability(e.target.value)}><option value="READY">Ready</option><option value="READY_WITH_REVIEW">Ready with review</option><option value="TRAINING_REQUIRED">Training required</option><option value="SPECIALIST_REQUIRED">Specialist required</option><option value="UNKNOWN">Unknown</option></select></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 27, fontSize: '0.8125rem' }}><input type="checkbox" checked={backup} onChange={(e) => setBackup(e.target.checked)} /> Qualified backup available</label>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={simulateDelivery} disabled={deliveryLoading}>{deliveryLoading ? 'CALCULATING…' : 'CALCULATE DELIVERY IMPACT'}</button>
            {deliveryError && <div style={{ color: 'var(--sev-critical)', fontSize: '0.75rem', marginTop: 10 }}>{deliveryError}</div>}
          </div>
          <div style={{ minHeight: 230 }}>
            {deliveryResult ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Forecast duration', `${deliveryResult.forecast_days} days`], ['Additional exposure', `${deliveryResult.additional_exposure_days} days`], ['Delay-attributable loss', formatRupees(deliveryResult.delay_attributable_loss_inr)], ['Risk reduction at risk', formatRupees(deliveryResult.risk_reduction_at_risk_inr)]].map(([label, value]) => <div key={label} style={{ padding: 16, border: '1px solid var(--bg-border)', borderRadius: 8, background: 'var(--bg-elevated)' }}><div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div><strong style={{ fontSize: '1.125rem' }}>{value}</strong></div>)}
              <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incident probability through forecast completion: {(deliveryResult.forecast_period_probability * 100).toFixed(2)}%</div>
            </div> : <div className="empty-state" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Enter delivery conditions and calculate the company’s additional expected loss.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
