import { ArrowUp, ArrowDown } from 'lucide-react';
import { riskColor, formatLakh } from '../../utils/format';
import InfoTooltip from '../common/InfoTooltip';

interface Props {
  score: number;
  previousScore: number;
  target?: number;
  ealLakh: number;
  confidence?: number;
  onOpenDetail: () => void;
}

function classify(score: number): string {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Elevated';
  return 'Low';
}

/** Large executive risk-posture gauge — the centerpiece metric of the Security Dashboard. */
export default function RiskPostureCard({ score, previousScore, target = 45, ealLakh, confidence = 91, onOpenDetail }: Props) {
  const color = riskColor(score);
  const delta = score - previousScore;
  const circumference = 2 * Math.PI * 54;
  const pct = Math.min(100, score) / 100;
  const dash = circumference * pct;

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenDetail()}
      style={{ cursor: 'pointer', display: 'flex', gap: 24, alignItems: 'center' }}
    >
      <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
        <svg width={140} height={140} viewBox="0 0 140 140">
          <circle cx={70} cy={70} r={54} fill="none" stroke="var(--color-bg-secondary)" strokeWidth={12} />
          <circle
            cx={70}
            cy={70}
            r={54}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>/ 100</div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="card-title" style={{ margin: 0 }}>
            Enterprise Risk Posture
          </span>
          <InfoTooltip text="Composite score combining asset business criticality, likelihood of exploitation, and residual risk after existing controls." />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 500, color }}>{classify(score)} Risk</span>
          <span className={`metric-delta ${delta <= 0 ? 'down-good' : 'up-bad'}`}>
            {delta <= 0 ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
            {Math.abs(delta)}pts vs. last period
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Confidence</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{confidence}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Target</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{target}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Est. Annual Loss</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-critical)' }}>{formatLakh(ealLakh)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
