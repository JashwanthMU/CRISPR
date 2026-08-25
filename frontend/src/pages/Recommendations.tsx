import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, ArrowRight } from 'lucide-react';
import { REMEDIATION_SCENARIOS } from '../demo/fixtures';
import SeverityBadge from '../components/common/SeverityBadge';
import { formatRupees } from '../utils/format';
import { toast } from '../lib/toastStore';
import { getControls } from '../services/api';

export default function Recommendations() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState(REMEDIATION_SCENARIOS);

  useEffect(() => {
    getControls().then((response) => {
      if (!response?.data) return;
      setRecommendations(response.data.map((control: any) => ({
        id: control.id,
        title: control.name,
        finding: 'Recommended by the deterministic budget optimizer catalogue',
        affectedResource: 'NovaPay enterprise controls',
        recommendedFix: control.name,
        priority: control.risk_reduction_inr >= 4_000_000 ? 'CRITICAL' : control.risk_reduction_inr >= 2_000_000 ? 'HIGH' : 'MEDIUM',
        estimatedEffort: `${control.time_weeks} week${control.time_weeks === 1 ? '' : 's'}`,
        riskReductionInr: control.risk_reduction_inr,
        status: 'NOT_STARTED',
      })));
    });
  }, []);

  const active = recommendations.filter((s) => !dismissed.has(s.id)).sort((a, b) => b.riskReductionInr - a.riskReductionInr);

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ListChecks size={22} color="var(--color-primary-blue)" /> Recommendations
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Prioritized remediation guidance ranked by risk reduction and effort
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {active.map((s) => (
          <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <SeverityBadge severity={s.priority} />
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>{s.finding}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                Fix: {s.recommendedFix} · Effort: {s.estimatedEffort}
                {s.owner && ` · Owner: ${s.owner.name}`}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sev-low)' }}>{formatRupees(s.riskReductionInr)}</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 8 }}>risk reduction</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.6875rem' }}
                  onClick={() => {
                    setDismissed((d) => new Set(d).add(s.id));
                    toast.info('Recommendation dismissed');
                  }}
                >
                  Dismiss
                </button>
                <button
                  className="btn-primary"
                  style={{ padding: '5px 10px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => navigate('/remediation-queue')}
                >
                  Start Remediation <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {active.length === 0 && (
          <div className="card">
            <div className="empty-state">All recommendations have been triaged. New guidance appears here after each analysis run.</div>
          </div>
        )}
      </div>
    </div>
  );
}
