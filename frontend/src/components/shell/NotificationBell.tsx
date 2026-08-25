import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useUiStore, togglePopover, closePopover } from '../../lib/uiStore';
import {
  useNotificationStore,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../../lib/notificationStore';

const SEVERITY_DOT: Record<AppNotification['severity'], string> = {
  critical: 'status-dot-critical',
  warning: 'status-dot-warning',
  info: 'status-dot-info',
  success: 'status-dot-ok',
};

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Fully interactive notification bell + panel. Unread state is real (backed
 * by useNotificationStore, which is itself wired to live demo-engine events —
 * see src/lib/notificationStore.ts), not a hardcoded badge.
 */
export default function NotificationBell() {
  const openPopover = useUiStore((s) => s.openPopover);
  const notifications = useNotificationStore((s) => s.notifications);
  const open = openPopover === 'notifications';
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unread = notifications.filter((n) => n.unread).length;

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

  const openNotification = (n: AppNotification) => {
    markNotificationRead(n.id);
    closePopover();
    navigate(n.path);
  };

  return (
    <div className="topbar-popover-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        style={{ position: 'relative' }}
        onClick={() => togglePopover('notifications')}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
      >
        <Bell size={17} strokeWidth={1.8} />
        {unread > 0 && <span className="notif-unread-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="notif-panel topbar-dropdown-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="notif-mark-all" onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-panel-list">
            {notifications.map((n) => (
              <button key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={() => openNotification(n)}>
                <span className={`notif-dot ${SEVERITY_DOT[n.severity]}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-body">{n.resource}</div>
                  <div className="notif-item-time">{timeAgo(n.timestamp)}</div>
                </div>
              </button>
            ))}
            {notifications.length === 0 && <div className="empty-state">You're all caught up.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
