import { useState } from 'react';
import { GitPullRequest, GitBranch } from 'lucide-react';
import Modal from '../common/Modal';
import { toast } from '../../lib/toastStore';

interface Props {
  open: boolean;
  onClose: () => void;
  repository: string;
  branch: string;
  packageName: string;
  targetVersion: string;
  resourceLabel: string;
}

/** Mirrors the "Open Pull Request" flow shown in the Wiz reference screenshots. */
export default function OpenPrModal({ open, onClose, repository, branch, packageName, targetVersion, resourceLabel }: Props) {
  const [step, setStep] = useState<'confirm' | 'done'>('confirm');

  const handleClose = () => {
    setStep('confirm');
    onClose();
  };

  const submit = () => {
    setStep('done');
    toast.success('Pull request opened', `${packageName} → ${targetVersion} on ${repository}`);
  };

  return (
    <Modal open={open} onClose={handleClose} width={480}>
      {step === 'confirm' ? (
        <>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.4 }}>
            Open Pull Request to fix vulnerabilities in {resourceLabel}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Target Resource</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px' }}>
              <GitBranch size={14} color="var(--text-muted)" />
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{repository}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Repository Branch</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <GitBranch size={11} /> {branch}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
              Upgrading the {packageName} package to version <strong>{targetVersion}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn-secondary" onClick={handleClose}>
              Back
            </button>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={submit}>
              <GitPullRequest size={14} /> Open Pull Request
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 8 }}>Pull request opened</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            A pull request upgrading <strong style={{ color: 'var(--text-primary)' }}>{packageName}</strong> to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{targetVersion}</strong> was opened against{' '}
            <span style={{ fontFamily: 'monospace' }}>{repository}</span> ({branch}).
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleClose}>
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
