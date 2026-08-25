import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, GitBranch, ScanSearch, AlertTriangle, ShieldAlert, UserCheck, FileCheck2, Circle } from 'lucide-react';
import { useUiStore, togglePopover, closePopover } from '../../lib/uiStore';
import { useDemoStore } from '../../demo/demoStore';
import type { TimelineEvent } from '../../types';

const KIND_ICON: Record<TimelineEvent['kind'], typeof Circle> = {
  info: GitBranch,
  success: FileCheck2,
  warning: AlertTriangle,
  error: ShieldAlert,
};

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes('repository') || l.includes('sync')) return GitBranch;
  if (l.includes('scan') || l.includes('correlation') || l.includes('ingestion')) return ScanSearch;
  if (l.includes('risk case') || l.includes('risk engine')) return AlertTriangle;
  if (l.includes('finding') || l.includes('bug bounty')) return ShieldAlert;
  if (l.includes('assigned') || l.includes('owner')) return UserCheck;
  if (l.includes('report')) return FileCheck2;
  return Circle;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Recent Activity — reads the SAME timeline feed the demo engine already
 * maintains (useDemoStore.timeline, pushed to by pushTimeline() in
 * demoStore.ts on every REPOSITORY_CONNECTED / INGESTION_* / CORRELATION_* /
 * RISK_ENGINE_* / REPORT_GENERATED event). This is not a separate mock list —
 * running "Run Analysis" from the header genuinely populates this panel
 * live, in real time.
 */
export default function RecentActivity() {
  const openPopover = useUiStore((s) => s.openPopover);
  const timeline = useDemoStore((s) => s.timeline);
  const open = openPopover === 'activity';
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const goToRelated = (event: TimelineEvent) => {
    const l = event.label.toLowerCase();
    closePopover();
    if (l.includes('repository') || l.includes('sync')) navigate('/code-security');
    else if (l.includes('risk case') || l.includes('risk engine')) navigate('/risks');
    else if (l.includes('finding') || l.includes('bounty')) navigate('/findings');
    else if (l.includes('report')) navigate('/reports');
    else navigate('/security');
  };

  return (
    <div className="topbar-popover-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => togglePopover('activity')}
        aria-label="Recent activity"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Recent activity"
      >
        <History size={17} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="notif-panel topbar-dropdown-panel" role="dialog" aria-label="Recent activity">
          <div className="notif-panel-header">Recent Activity</div>
          <div className="notif-panel-list">
            {timeline.slice(0, 12).map((event) => {
              const Icon = iconFor(event.label);
              const KindIcon = KIND_ICON[event.kind];
              return (
                <button key={event.id} className="notif-item" onClick={() => goToRelated(event)}>
                  <span className={`activity-icon activity-icon-${event.kind}`}>
                    <Icon size={14} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notif-item-title">{event.label}</div>
                    {event.detail && <div className="notif-item-body">{event.detail}</div>}
                    <div className="notif-item-time">
                      <KindIcon size={9} /> {timeAgo(event.timestamp)}
                    </div>
                  </div>
                </button>
              );
            })}
            {timeline.length === 0 && <div className="empty-state">No activity yet — run an analysis to populate this feed.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
