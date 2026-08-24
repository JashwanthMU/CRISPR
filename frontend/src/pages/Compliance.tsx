import { useEffect, useState } from 'react';
import ComplianceRadar from '../components/charts/ComplianceRadar';
import ProgressBar from '../components/common/ProgressBar';
import { getCompliance, getGaps } from '../services/api';
import { MOCK_COMPLIANCE, MOCK_GAPS } from '../utils/mock';
import { formatRupees } from '../utils/format';

const LABELS: Record<string, string> = {
  ISO_27001: 'ISO 27001',
  NIST_CSF: 'NIST CSF',
  CIS_CONTROLS: 'CIS Controls',
  RBI_CSF: 'RBI CSF',
  SEBI_CSCRF: 'SEBI CSCRF',
};

function statusOf(score: number) {
  if (score >= 85) return { label: 'Compliant', color: '#22c55e' };
  if (score >= 75) return { label: 'Needs Attention', color: '#f97316' };
  return { label: 'Non-Compliant', color: '#ef4444' };
}

function priorityColor(p: string) {
  return p === 'CRITICAL' ? '#ef4444' : p === 'HIGH' ? '#f97316' : '#eab308';
}

export default function Compliance() {
  const [compliance, setCompliance] = useState<any[]>(MOCK_COMPLIANCE);
  const [gaps, setGaps] = useState<any[]>(MOCK_GAPS);

  useEffect(() => {
    Promise.all([getCompliance(), getGaps()]).then(([c, g]) => {
      if (c?.data) setCompliance(c.data);
      if (g?.data) setGaps(g.data);
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Compliance Dashboard</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Regulatory framework posture and financial impact of open gaps
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {compliance.map((c) => {
          const status = statusOf(c.score);
          return (
            <div key={c.framework} className="card">
              <div className="card-title">{LABELS[c.framework] ?? c.framework}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: status.color }}>{c.score}%</div>
              <div style={{ margin: '10px 0' }}>
                <ProgressBar value={c.score} color={status.color} showValue={false} />
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: `${status.color}20`,
                  color: status.color,
                }}
              >
                {status.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">Framework Score Radar</div>
          <ComplianceRadar data={compliance} />
        </div>

        <div className="card">
          <div className="card-title">Compliance Gaps</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Framework</th>
                <th>Control</th>
                <th>Gap Description</th>
                <th>₹ Impact</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g, i) => (
                <tr key={i}>
                  <td>{LABELS[g.framework] ?? g.framework}</td>
                  <td>{g.control}</td>
                  <td style={{ maxWidth: 220 }}>{g.gap_description}</td>
                  <td style={{ color: 'var(--sev-critical)', fontWeight: 700 }}>{formatRupees(g.financial_impact_inr)}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: `${priorityColor(g.priority)}20`,
                        color: priorityColor(g.priority),
                      }}
                    >
                      {g.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
