import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** Generic slide-in drawer primitive used for Risk Case / Finding / Repository / Attack Path detail views. */
export default function Drawer({ open, onClose, title, subtitle, headerExtra, tabs, activeTab, onTabChange, footer, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.0625rem', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {headerExtra}
            <button className="icon-btn" onClick={onClose} aria-label="Close panel">
              <X size={16} />
            </button>
          </div>
        </div>
        {tabs && (
          <div className="drawer-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                className={`drawer-tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => onTabChange?.(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="drawer-body">
          <div key={activeTab ?? 'default'} className="tab-panel-enter">
            {children}
          </div>
        </div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </>
  );
}
