import { useEffect, useRef } from 'react';
import { useUiStore, togglePopover, closePopover } from '../../lib/uiStore';
import { useDemoStore } from '../../demo/demoStore';
import type { PipelineStageState } from '../../types';

interface SystemRow {
  label: string;
  state: PipelineStageState;
}

const STATE_LABEL: Record<PipelineStageState, string> = {
  idle: 'Operational',
  processing: 'Processing',
  completed: 'Operational',
  warning: 'Warning',
  failed: 'Unavailable',
};

const STATE_DOT_CLASS: Record<PipelineStageState, string> = {
  idle: 'status-dot-ok',
  processing: 'status-dot-processing',
  completed: 'status-dot-ok',
  warning: 'status-dot-warning',
  failed: 'status-dot-critical',
};

/**
 * "All systems operational" indicator, wired to the REAL pipeline state in
 * useDemoStore (the same state SecurityPipeline.tsx renders). While "Run
 * Analysis" is in progress, the relevant subsystem genuinely flips to
 * "Processing" here — this is not a decorative static label.
 */
export default function SystemStatus() {
  const openPopover = useUiStore((s) => s.openPopover);
  const pipeline = useDemoStore((s) => s.pipeline);
  const isRunning = useDemoStore((s) => s.isRunning);
  const open = openPopover === 'status';
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closePopover();
    };
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closePopover();
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const stageState = (id: string): PipelineStageState => pipeline.find((p) => p.id === id)?.state ?? 'idle';

  const rows: SystemRow[] = [
    { label: 'API', state: 'completed' },
    { label: 'Database', state: 'completed' },
    { label: 'Ingestion', state: stageState('ingestion') },
    { label: 'Correlation', state: stageState('correlation') },
    { label: 'Risk Engine', state: stageState('risk-engine') },
    { label: 'AI Engine', state: stageState('ai-analysis') },
  ];

  const anyIssue = rows.some((r) => r.state === 'warning' || r.state === 'failed');
  const overallLabel = isRunning ? 'Analysis in progress' : anyIssue ? 'Degraded performance' : 'All systems operational';
  const overallDotClass = isRunning ? 'status-dot-processing' : anyIssue ? 'status-dot-warning' : 'status-dot-ok';

  return (
    <div className="topbar-popover-wrap" ref={ref}>
      <button
        type="button"
        className="topbar-status"
        onClick={() => togglePopover('status')}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={overallLabel}
      >
        <span className={`status-dot ${overallDotClass}`} />
        <span className="topbar-status-label">{overallLabel}</span>
      </button>
      {open && (
        <div className="topbar-dropdown-panel status-popover" role="dialog" aria-label="System status">
          <div className="notif-panel-header">System Status</div>
          <div className="status-popover-list">
            {rows.map((r) => (
              <div key={r.label} className="status-popover-row">
                <span>{r.label}</span>
                <span className="status-popover-value">
                  <span className={`status-dot ${STATE_DOT_CLASS[r.state]}`} />
                  {STATE_LABEL[r.state]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
