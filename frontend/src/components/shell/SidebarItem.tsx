import { useLanguage } from '../../lib/i18n';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { closeMobileNav } from '../../lib/uiStore';
import SidebarTooltip from './SidebarTooltip';

interface Props {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
}

/** A single navigation rail entry for expanded and collapsed sidebar modes. */
export default function SidebarItem({ to, label, icon: Icon, collapsed }: Props) {
  const { t } = useLanguage();
  return (
    <SidebarTooltip label={t(label)} enabled={collapsed}>
      <NavLink
        to={to}
        end
        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}${collapsed ? ' collapsed' : ''}`}
        onClick={closeMobileNav}
        aria-label={t(label)}
      >
        {({ isActive }) => (
          <>
            <span className="sidebar-item-active-bar" aria-hidden="true" />
            <span className="sidebar-item-icon">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className="sidebar-item-label">{t(label)}</span>
            {isActive && <span className="sr-only" />}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}
