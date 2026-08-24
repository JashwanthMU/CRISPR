import { useEffect, useRef } from 'react';
import { useDemoStore } from '../../demo/demoStore';

interface Props {
  height?: number;
  title?: string;
}

const LINE_CLASS: Record<string, string> = {
  command: 'terminal-line-command',
  info: 'terminal-line-info',
  ok: 'terminal-line-ok',
  warn: 'terminal-line-warn',
  error: 'terminal-line-error',
  result: 'terminal-line-result',
};

/**
 * Lightweight terminal renderer synchronized to the demo engine's
 * terminalLines state (src/demo/demoStore.ts). This is a hand-built
 * substitute for xterm.js — there is no npm registry access in this
 * sandbox to add it as a real dependency. The transcript model
 * (array of {id,text,kind}) is intentionally simple so swapping in a
 * real xterm.js instance later only requires changing this render
 * function's internals, not any calling code.
 */
export default function Terminal({ height = 220, title = 'crispr — scan' }: Props) {
  const lines = useDemoStore((s) => s.terminalLines);
  const isRunning = useDemoStore((s) => s.isRunning);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines.length]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          padding: '8px 14px',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--color-critical)' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--color-warning)' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--color-success)' }} />
        <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{title}</span>
      </div>
      <div className="terminal-window" style={{ height, borderRadius: '0 0 var(--radius-md) var(--radius-md)', borderTop: 'none' }}>
        {lines.map((l) => (
          <div key={l.id} className={LINE_CLASS[l.kind]}>
            {l.text || '\u00A0'}
          </div>
        ))}
        {isRunning && <span className="terminal-cursor" />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
