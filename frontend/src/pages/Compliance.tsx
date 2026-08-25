import { useEffect, useState } from 'react';
import ComplianceRadar from '../components/charts/ComplianceRadar';
import ProgressBar from '../components/common/ProgressBar';
import { getCompliance, getGaps } from '../services/api';
import { MOCK_COMPLIANCE, MOCK_GAPS } from '../utils/mock';
import { formatRupees, TOKENS } from '../utils/format';

const LABELS: Record<string, string> = {
  ISO_27001: 'ISO 27001',
  NIST_CSF: 'NIST CSF',
  CIS_CONTROLS: 'CIS Controls',
  RBI_CSF: 'RBI CSF',
  SEBI_CSCRF: 'SEBI CSCRF',
};

function statusOf(score: number) {
  if (score >= 85) return { label: 'Compliant', color: TOKENS.success };
  if (score >= 75) return { label: 'Needs Attention', color: TOKENS.sevHigh };
  return { label: 'Non-Compliant', color: TOKENS.critical };
}

function priorityColor(p: string) {
  return p === 'CRITICAL' ? TOKENS.critical : p === 'HIGH' ? TOKENS.sevHigh : TOKENS.warning;
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
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title">Compliance Dashboard</h1>
        <p className="page-subtitle">Regulatory framework posture and financial impact of open gaps</p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {compliance.map((c) => {
          const status = statusOf(c.score);
          return (
            <div key={c.framework} className="card">
              <div className="card-title">{LABELS[c.framework] ?? c.framework}</div>
              <div style={{ fontSize: '2rem', fontWeight: 500, color: status.color }}>{c.score}%</div>
              <div style={{ margin: '10px 0' }}>
                <ProgressBar value={c.score} color={status.color} showValue={false} />
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: 'var(--color-bg)',
                  border: `1px solid ${status.color}`,
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
                  <td style={{ maxWidth: 220 }}>{g.gap ?? g.gap_description}</td>
                  <td style={{ color: 'var(--color-critical)', fontWeight: 500 }}>{formatRupees(g.impact_inr ?? g.financial_impact_inr)}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--color-bg)',
                        border: `1px solid ${priorityColor(g.priority)}`,
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
