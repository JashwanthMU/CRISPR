import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { getSession } from '../../lib/auth';

export interface VerificationInput {
  result: 'PASSED' | 'FAILED';
  method: 'RESCAN' | 'CONTROL_TEST' | 'CONFIGURATION_REVIEW' | 'MANUAL_EVIDENCE';
  evidence_reference: string;
  evidence_summary: string;
  observed_at: string;
  expected_version: number;
}

export interface VerificationRecord extends Omit<VerificationInput, 'expected_version'> {
  id?: string;
  verifier_name?: string;
  created_at?: string;
}

export default function VerificationModal({ open, ticketTitle, version, history, canVerify, onClose, onSubmit }: {
  open: boolean;
  ticketTitle: string;
  version: number;
  history: VerificationRecord[];
  canVerify: boolean;
  onClose: () => void;
  onSubmit: (input: VerificationInput) => Promise<void>;
}) {
  const user = getSession()?.user;
  const [result, setResult] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [method, setMethod] = useState<VerificationInput['method']>('RESCAN');
  const [reference, setReference] = useState('');
  const [summary, setSummary] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setObservedAt(new Date().toISOString().slice(0, 16));
  }, [open]);

  const submit = async () => {
    if (reference.trim().length < 3 || summary.trim().length < 10 || !observedAt) {
      setError('Evidence reference, observation time and a meaningful summary are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        result, method, evidence_reference: reference.trim(), evidence_summary: summary.trim(),
        observed_at: new Date(observedAt).toISOString(), expected_version: version,
      });
      onClose();
    } catch {
      setError('Verification could not be recorded. Refresh the queue and try again.');
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={onClose} width={620}>
    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Verify remediation</div>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 16 }}>{ticketTitle}</div>
    {canVerify && <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <label>Verification result<select className="input-field" value={result} onChange={(e) => setResult(e.target.value as 'PASSED' | 'FAILED')}>
        <option value="PASSED">Passed — control is effective</option><option value="FAILED">Failed — reopen remediation</option>
      </select></label>
      <label>Evidence method<select className="input-field" value={method} onChange={(e) => setMethod(e.target.value as VerificationInput['method'])}>
        <option value="RESCAN">Security rescan</option><option value="CONTROL_TEST">Control test</option>
        <option value="CONFIGURATION_REVIEW">Configuration review</option><option value="MANUAL_EVIDENCE">Manual evidence review</option>
      </select></label>
      <label>Observed at<input className="input-field" type="datetime-local" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} /></label>
      <label>Authorized verifier<input className="input-field" value={user?.name ?? 'Current security reviewer'} disabled /></label>
      <label style={{ gridColumn: '1 / -1' }}>Evidence reference<input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={500} placeholder="Scanner run ID, control-test ID, ticket or evidence URL" /></label>
      <label style={{ gridColumn: '1 / -1' }}>Evidence summary<textarea className="input-field" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={2000} placeholder="State what was tested and the observed result." /></label>
    </div>}
    {canVerify && <div style={{ marginTop: 12, padding: 10, background: 'var(--color-bg-subtle)', borderRadius: 6, fontSize: '0.75rem' }}>
      {result === 'PASSED'
        ? 'Passing verification closes the item and converts its projected reduction into verified realized reduction.'
        : 'Failed verification records the evidence, realizes ₹0 and reopens the item for corrective work.'}
    </div>}
    {error && <div style={{ color: 'var(--sev-critical)', fontSize: '0.75rem', marginTop: 10 }}>{error}</div>}
    {history.length > 0 && <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 6 }}>Verification history</div>
      {history.slice(0, 4).map((item, index) => <div key={item.id ?? index} style={{ borderTop: '1px solid var(--color-border)', padding: '7px 0', fontSize: '0.6875rem' }}>
        <b style={{ color: item.result === 'PASSED' ? 'var(--sev-low)' : 'var(--sev-critical)' }}>{item.result}</b>
        {' · '}{item.method.replace(/_/g, ' ')}{' · '}{item.verifier_name ?? 'Security reviewer'}
        <div style={{ color: 'var(--text-muted)' }}>{item.evidence_reference}</div>
      </div>)}
    </div>}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
      <button className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
      {canVerify && <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Recording…' : 'Record verification'}</button>}
    </div>
  </Modal>;
}
