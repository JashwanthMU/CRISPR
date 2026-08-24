import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, dismissToast } from '../../lib/toastStore';

const ICON: Record<string, any> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLOR: Record<string, string> = {
  success: 'var(--sev-low)',
  error: 'var(--sev-critical)',
  info: 'var(--accent-cyan)',
  warning: 'var(--sev-medium)',
};

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id} className={`toast-item ${t.kind}`}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon size={16} color={COLOR[t.kind]} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{t.title}</div>
                {t.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{t.description}</div>}
              </div>
              <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
                <X size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
