import { Fragment, useEffect, useState } from 'react';
import { Download, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import ProgressBar from '../components/common/ProgressBar';
import { getFindings, getRisks } from '../services/api';
import { MOCK_FINDINGS, MOCK_RISKS } from '../utils/mock';
import { sourceColor, sourceLabel } from '../utils/format';

export default function Findings() {
  const [findings, setFindings] = useState<any[]>(MOCK_FINDINGS);
  const [risks, setRisks] = useState<any[]>(MOCK_RISKS);
  const [usingDemo, setUsingDemo] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFindings(), getRisks()]).then(([f, r]) => {
      if (f?.data) setFindings(f.data);
      else setUsingDemo(true);
      if (r?.data) setRisks(r.data);
    });
  }, []);

  const total = findings.length;
  const counts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => ({
    sev,
    count: findings.filter((f) => f.severity === sev).length,
  }));

  const correlatedAssetIds = new Set(risks.filter((r) => (r.sources ?? []).length > 1).map((r) => r.asset_id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Findings Explorer</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            All raw findings correlated across every connected source
          </p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => alert('Export started (stub)')}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Stats bar */}
      <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{total}</div>
        </div>
        {counts.map((c) => (
          <div key={c.sev}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.sev}</div>
            <div className={c.sev.toLowerCase() === 'critical' ? undefined : undefined} style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              <span
                style={{
                  color:
                    c.sev === 'CRITICAL'
                      ? 'var(--sev-critical)'
                      : c.sev === 'HIGH'
                      ? 'var(--sev-high)'
                      : c.sev === 'MEDIUM'
                      ? 'var(--sev-medium)'
                      : 'var(--sev-low)',
                }}
              >
                {c.count}
              </span>
            </div>
          </div>
        ))}
        {usingDemo && (
          <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>● Using demo data</span>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 24 }}></th>
              <th>Severity</th>
              <th>Finding ID</th>
              <th>Title</th>
              <th>Asset</th>
              <th>Source</th>
              <th>Confidence</th>
              <th>First Seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const isExpanded = expanded === f.finding_id;
              const correlated = correlatedAssetIds.has(f.asset_id);
              return (
                <Fragment key={f.finding_id}>
                  <tr onClick={() => setExpanded(isExpanded ? null : f.finding_id)}>
                    <td>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                    <td>
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{f.finding_id}</td>
                    <td>{f.title}</td>
                    <td>{f.asset_id}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: `${sourceColor(f.source_type)}20`,
                          color: sourceColor(f.source_type),
                        }}
                      >
                        {sourceLabel(f.source_type)}
                      </span>
                    </td>
                    <td style={{ width: 100 }}>
                      <ProgressBar value={Math.round(f.confidence * 100)} showValue={false} height={5} />
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{f.first_seen}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color:
                            f.status === 'OPEN' ? 'var(--sev-critical)' : f.status === 'VALIDATED' ? 'var(--sev-high)' : 'var(--sev-medium)',
                        }}
                      >
                        {f.status}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} style={{ background: 'var(--bg-elevated)' }}>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontSize: '0.8125rem' }}>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Finding Type</div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.finding_type}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Source</div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.source_name}</div>
                            </div>
                            {f.cve && (
                              <div>
                                <div style={{ color: 'var(--text-muted)' }}>CVE</div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.cve}</div>
                              </div>
                            )}
                            <div>
                              <div style={{ color: 'var(--text-muted)' }}>Confidence</div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(f.confidence * 100)}%</div>
                            </div>
                          </div>
                          {correlated && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--accent-cyan)',
                                marginTop: 8,
                              }}
                            >
                              <Link2 size={13} /> Part of correlated risk case
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
