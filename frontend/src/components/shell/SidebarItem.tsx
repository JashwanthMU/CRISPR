import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { closeMobileNav } from '../../lib/uiStore';

interface Props {
  to: string;
  label: string;
  icon: LucideIcon;
  collapsed: boolean;
}

/**
 * A single navigation rail entry. Works identically in collapsed (icon +
 * tooltip) and expanded (icon + label) modes — the tooltip is rendered
 * unconditionally and revealed purely by CSS (`.nav-tooltip` opacity on
 * hover/focus, see index.css) so it never fights with React state timing.
 */
export default function SidebarItem({ to, label, icon: Icon, collapsed }: Props) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}${collapsed ? ' collapsed' : ''}`}
      onClick={closeMobileNav}
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          <span className="sidebar-item-active-bar" aria-hidden="true" />
          <span className="sidebar-item-icon">
            <Icon size={18} strokeWidth={1.8} />
          </span>
          <span className="sidebar-item-label">{label}</span>
          {collapsed && (
            <span className="nav-tooltip" role="tooltip">
              {label}
            </span>
          )}
          {/* aria-current is applied automatically by NavLink for active state; isActive kept for future use */}
          {isActive && <span className="sr-only" />}
        </>
      )}
    </NavLink>
  );
}
