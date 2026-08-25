import { useState } from 'react';
import Drawer from '../common/Drawer';
import SeverityBadge from '../common/SeverityBadge';
import ProgressBar from '../common/ProgressBar';
import { sourceColor, sourceLabel } from '../../utils/format';
import { toast } from '../../lib/toastStore';
import type { Finding, RiskCase } from '../../types';

interface Props {
  finding: Finding | null;
  correlatedRiskCase?: RiskCase;
  open: boolean;
  onClose: () => void;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'investigation', label: 'Investigation' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'attack-path', label: 'Attack Path' },
  { id: 'related', label: 'Related Assets' },
  { id: 'remediation', label: 'Remediation' },
  { id: 'comments', label: 'Comments' },
  { id: 'history', label: 'History' },
];

export default function FindingDetailDrawer({ finding, correlatedRiskCase, open, onClose }: Props) {
  const [tab, setTab] = useState('overview');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ author: string; text: string; at: string }[]>([
    { author: 'Sara Kapoor', text: 'Confirmed with the bug bounty researcher — this is a real auth bypass, not a false positive.', at: '2026-08-11' },
  ]);

  if (!finding) return null;

  const addComment = () => {
    if (!comment.trim()) return;
    setComments((prev) => [...prev, { author: 'You', text: comment, at: new Date().toISOString().slice(0, 10) }]);
    setComment('');
    toast.success('Comment added');
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={finding.title}
      subtitle={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SeverityBadge severity={finding.severity} />
          <span style={{ fontFamily: 'monospace' }}>{finding.finding_id}</span>
          {finding.cve && <span style={{ fontFamily: 'monospace' }}>· {finding.cve}</span>}
        </span>
      }
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      footer={
        <>
          <button className="btn-primary" onClick={() => toast.success('Finding assigned', 'Assigned to the owning team.')}>
            Assign
          </button>
          <button className="btn-secondary" onClick={() => toast.warning('Finding suppressed')}>
            Suppress
          </button>
          <button className="btn-secondary" onClick={() => toast.success('Marked resolved', finding.title)}>
            Mark Resolved
          </button>
          <button className="btn-secondary" onClick={() => toast.info('Export started', `${finding.finding_id}.json`)}>
            Export
          </button>
        </>
      }
    >
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.8125rem' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginBottom: 4 }}>Resource</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{finding.asset_id}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginBottom: 4 }}>Source</div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--color-bg)',
                  border: `1px solid ${sourceColor(finding.source_type)}`,
                  color: sourceColor(finding.source_type),
                }}
              >
                {sourceLabel(finding.source_type)}
              </span>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginBottom: 4 }}>First Seen</div>
              <div style={{ color: 'var(--text-primary)' }}>{finding.first_seen}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginBottom: 4 }}>Status</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{finding.status}</div>
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginBottom: 6 }}>Confidence</div>
            <ProgressBar value={Math.round(finding.confidence * 100)} color="var(--color-secondary-blue)" />
          </div>
          {correlatedRiskCase && (
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-blue-surface)', border: '1px solid var(--color-light-blue)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-blue)', marginBottom: 4 }}>Part of a correlated risk case</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {correlatedRiskCase.asset_name} — risk score {correlatedRiskCase.risk_score}, corroborated by {correlatedRiskCase.sources.length} independent
                sources.
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'investigation' && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <p>
            This finding was triaged automatically by the CRISPR correlation engine. It was cross-referenced against{' '}
            {correlatedRiskCase ? correlatedRiskCase.sources.length : 1} independent telemetry source(s) and assigned a confidence score of{' '}
            {Math.round(finding.confidence * 100)}% based on corroborating signals, asset criticality, and historical false-positive rates for this
            finding type ({finding.finding_type}).
          </p>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="terminal-window" style={{ height: 'auto' }}>
          <div className="terminal-line-info">// raw evidence excerpt</div>
          <div className="terminal-line-command">$ crispr evidence show {finding.finding_id}</div>
          <div>{'{'}</div>
          <div>&nbsp;&nbsp;"finding_id": "{finding.finding_id}",</div>
          <div>&nbsp;&nbsp;"source": "{finding.source_name}",</div>
          <div>&nbsp;&nbsp;"asset_id": "{finding.asset_id}",</div>
          <div>&nbsp;&nbsp;"confidence": {finding.confidence},</div>
          <div>&nbsp;&nbsp;"first_seen": "{finding.first_seen}"</div>
          <div>{'}'}</div>
        </div>
      )}

      {tab === 'attack-path' && (
        <div className="empty-state">
          {correlatedRiskCase ? (
            <span>An attack path is available for this risk case. Open it from the Attack Paths page or the Risk Case detail drawer.</span>
          ) : (
            <span>No attack path has been mapped for this finding yet.</span>
          )}
        </div>
      )}

      {tab === 'related' && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Related asset: <strong style={{ color: 'var(--text-primary)' }}>{finding.asset_id}</strong>
        </div>
      )}

      {tab === 'remediation' && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <p>Recommended remediation for {finding.finding_type} findings:</p>
          <ul style={{ paddingLeft: 18 }}>
            <li>Validate the finding against the affected resource in a non-production environment.</li>
            <li>Apply the vendor patch or configuration change and redeploy.</li>
            <li>Re-scan to confirm remediation and close the finding.</li>
          </ul>
        </div>
      )}

      {tab === 'comments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map((c, i) => (
            <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--bg-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>{c.author}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>{c.at}</span>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.text}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input-field" style={{ flex: 1 }} placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} />
            <button className="btn-primary" onClick={addComment}>
              Post
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { at: finding.first_seen, label: `Finding first detected by ${finding.source_name}` },
            { at: finding.first_seen, label: 'Auto-triaged by CRISPR correlation engine' },
            { at: '2026-08-24', label: `Status: ${finding.status}` },
          ].map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--text-subtle)', width: 90, flexShrink: 0 }}>{h.at}</span>
              <span style={{ color: 'var(--text-muted)' }}>{h.label}</span>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
