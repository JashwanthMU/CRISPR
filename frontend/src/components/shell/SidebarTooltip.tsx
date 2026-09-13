import { cloneElement, useId, useState, type FocusEvent, type MouseEvent, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  label: string;
  enabled: boolean;
  children: ReactElement<Record<string, unknown>>;
}

export default function SidebarTooltip({ label, enabled, children }: Props) {
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const show = (target: HTMLElement) => {
    if (!enabled) return;
    const rect = target.getBoundingClientRect();
    setPosition({ left: rect.right + 10, top: rect.top + rect.height / 2 });
  };

  const child = cloneElement(children, {
    onMouseEnter: (event: MouseEvent<HTMLElement>) => show(event.currentTarget),
    onMouseLeave: () => setPosition(null),
    onFocus: (event: FocusEvent<HTMLElement>) => show(event.currentTarget),
    onBlur: () => setPosition(null),
    'aria-describedby': enabled && position ? id : undefined,
  });

  return (
    <>
      {child}
      {enabled && position && createPortal(
        <span
          id={id}
          className="sidebar-floating-tooltip"
          role="tooltip"
          style={{ left: position.left, top: position.top }}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  );
}
