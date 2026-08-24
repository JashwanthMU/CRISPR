import { ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

/** Centered modal dialog primitive (distinct from Drawer, which slides from the right). */
export default function Modal({ open, onClose, children, width = 460 }: Props) {
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
    <div
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay-color)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width,
          maxWidth: '92vw',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 24,
          animation: 'command-in var(--motion-base) var(--ease-standard)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
