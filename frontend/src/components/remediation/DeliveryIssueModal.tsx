import { useState } from 'react';
import Modal from '../common/Modal';

export interface DeliveryIssueInput {
  issue_type: string;
  availability_impact: string;
  expected_resolution_at?: string;
  reassignment_allowed: boolean;
  note?: string;
}

export default function DeliveryIssueModal({ open, ticketTitle, onClose, onSubmit }: {
  open: boolean; ticketTitle: string; onClose: () => void;
  onSubmit: (issue: DeliveryIssueInput) => Promise<void>;
}) {
  const [type, setType] = useState('UNPLANNED_ABSENCE');
  const [impact, setImpact] = useState('UNAVAILABLE');
  const [resolution, setResolution] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ issue_type: type, availability_impact: impact, expected_resolution_at: resolution || undefined, reassignment_allowed: true, note: note || undefined });
      onClose();
    } finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} width={520}>
    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Report delivery issue</div>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 16 }}>{ticketTitle}</div>
    <div style={{ display: 'grid', gap: 12 }}>
      <label>Issue type<select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="UNPLANNED_ABSENCE">Unplanned absence</option><option value="MEDICAL_EMERGENCY">Medical emergency</option>
        <option value="WORKLOAD_CONFLICT">Workload conflict</option><option value="SKILL_GAP">Skill gap</option>
        <option value="DEPENDENCY_BLOCKED">Dependency blocked</option><option value="ESTIMATE_INCORRECT">Estimate incorrect</option>
      </select></label>
      <label>Availability impact<select className="input-field" value={impact} onChange={(e) => setImpact(e.target.value)}>
        <option value="UNAVAILABLE">Unavailable</option><option value="REDUCED">Reduced</option><option value="NONE">No availability impact</option>
      </select></label>
      <label>Expected resolution<input className="input-field" type="date" value={resolution} onChange={(e) => setResolution(e.target.value)} /></label>
      <label>Operational note<textarea className="input-field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Do not enter diagnoses or private medical details." /></label>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Store availability impact only. Medical details remain in the approved HR system.</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create issue'}</button></div>
    </div>
  </Modal>;
}
