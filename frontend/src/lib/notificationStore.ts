import { createStore } from './store';
import { demoBus } from '../demo/eventBus';

// ============================================================================
// Notification store — real, stateful, and wired into the live demo event
// bus. Seeded with the baseline notifications the product would show on
// load, then genuinely appends new ones as REPOSITORY_CONNECTED /
// FINDING_CREATED / RISK_CASE_CREATED / REPORT_GENERATED fire during
// "Run Analysis" — this is not a static mock list.
// ============================================================================

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: string;
  title: string;
  resource: string;
  timestamp: number; // epoch ms
  severity: NotificationSeverity;
  unread: boolean;
  path: string;
}

interface NotificationState {
  notifications: AppNotification[];
}

let counter = 0;
const nextId = () => `notif_${Date.now()}_${counter++}`;
const minutesAgo = (m: number) => Date.now() - m * 60_000;

export const useNotificationStore = createStore<NotificationState>({
  notifications: [
    {
      id: nextId(),
      title: 'Critical vulnerability detected',
      resource: 'Authentication API',
      timestamp: minutesAgo(2),
      severity: 'critical',
      unread: true,
      path: '/findings?severity=CRITICAL',
    },
    {
      id: nextId(),
      title: 'Risk score changed',
      resource: 'Payment Database',
      timestamp: minutesAgo(10),
      severity: 'warning',
      unread: true,
      path: '/risks',
    },
    {
      id: nextId(),
      title: 'Analysis completed',
      resource: 'payments-service',
      timestamp: minutesAgo(21),
      severity: 'success',
      unread: false,
      path: '/code-security/repositories/repo-payments-service',
    },
    {
      id: nextId(),
      title: 'Repository connected',
      resource: 'codesmiths/ml-kit',
      timestamp: minutesAgo(32),
      severity: 'info',
      unread: false,
      path: '/code-security',
    },
  ],
});

export function pushNotification(n: Omit<AppNotification, 'id' | 'timestamp' | 'unread'>) {
  const notification: AppNotification = { ...n, id: nextId(), timestamp: Date.now(), unread: true };
  useNotificationStore.setState((s) => ({ notifications: [notification, ...s.notifications].slice(0, 30) }));
}

export function markNotificationRead(id: string) {
  useNotificationStore.setState((s) => ({
    notifications: s.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
  }));
}

export function markAllNotificationsRead() {
  useNotificationStore.setState((s) => ({ notifications: s.notifications.map((n) => ({ ...n, unread: false })) }));
}

export function unreadCount(): number {
  return useNotificationStore.getState().notifications.filter((n) => n.unread).length;
}

// ----------------------------------------------------------------------------
// Wire real demo engine events into real notifications, once, at module load.
// ----------------------------------------------------------------------------
demoBus.on('REPOSITORY_CONNECTED', (e) => {
  pushNotification({
    title: 'Repository connected',
    resource: (e.payload as any)?.repository ?? 'repository',
    severity: 'info',
    path: '/code-security',
  });
});

demoBus.on('FINDING_CREATED', (e) => {
  const count = (e.payload as any)?.count ?? 1;
  pushNotification({
    title: `${count} new finding${count === 1 ? '' : 's'} detected`,
    resource: 'Risk engine',
    severity: 'critical',
    path: '/findings',
  });
});

demoBus.on('RISK_CASE_CREATED', (e) => {
  const count = (e.payload as any)?.count ?? 1;
  pushNotification({
    title: `${count} risk case${count === 1 ? '' : 's'} created`,
    resource: 'Correlation engine',
    severity: 'warning',
    path: '/risks',
  });
});

demoBus.on('REPORT_GENERATED', () => {
  pushNotification({
    title: 'Report generated',
    resource: 'Board Risk Report',
    severity: 'success',
    path: '/reports',
  });
});
