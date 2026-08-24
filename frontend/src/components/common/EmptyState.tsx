import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="empty-state">
      {icon ?? <Inbox size={22} color="var(--text-subtle)" />}
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      {description && <div style={{ fontSize: '0.75rem', maxWidth: 360 }}>{description}</div>}
      {action}
    </div>
  );
}
