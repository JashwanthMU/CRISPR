import { useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, HelpCircle } from 'lucide-react';
import {
  useUiStore,
  toggleSidebar,
  toggleNavGroup,
  closeMobileNav,
  SIDEBAR_COLLAPSED_WIDTH,
} from '../../lib/uiStore';
import { toast } from '../../lib/toastStore';
import { NAV_GROUPS } from './navConfig';
import SidebarGroup from './SidebarGroup';
import SidebarItem from './SidebarItem';
import SidebarResizer from './SidebarResizer';
import OrganizationSelector from './OrganizationSelector';
import { CrisprMark, CrisprMarkCompact } from '../../assets/branding/CrisprMark';
import { BRAND } from '../../config/branding';

/**
 * Vertical enterprise navigation rail (Wiz/Google-Cloud-Console style).
 * Three real states:
 *   - collapsed  (72px icon rail, default)
 *   - expanded   (200-320px, resizable, icons + labels)
 *   - mobile     (hidden by default, slides in as an overlay on <768px)
 *
 * State (collapsed/expanded, width, expanded nav groups) is owned by
 * useUiStore and persisted to localStorage — this is a real, working
 * shell, not a static mock.
 */
export default function Sidebar() {
  const navigate = useNavigate();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const width = useUiStore((s) => s.sidebarWidth);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const expandedGroups = useUiStore((s) => s.expandedGroups);

  const effectiveWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : width;

  return (
    <>
      {mobileNavOpen && (
        <div className="mobile-nav-overlay" onClick={closeMobileNav} aria-hidden="true" />
      )}
      <aside
        className={`app-sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileNavOpen ? ' mobile-nav-open' : ''}`}
        style={{ width: effectiveWidth }}
        aria-label="Primary navigation"
      >
        {/* Brand header */}
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => {
            navigate('/security');
            closeMobileNav();
          }}
          aria-label={`${BRAND.name} — go to Security Dashboard`}
          title={collapsed ? BRAND.name : undefined}
        >
          {collapsed ? <CrisprMarkCompact size={28} /> : <CrisprMark size={28} />}
          {!collapsed && (
            <span className="sidebar-brand-text">
              <span className="sidebar-brand-name">{BRAND.name}</span>
              <span className="sidebar-brand-tagline">{BRAND.tagline}</span>
            </span>
          )}
          {collapsed && (
            <span className="nav-tooltip" role="tooltip">
              {BRAND.name} — {BRAND.tagline}
            </span>
          )}
        </button>

        <div className="sidebar-divider" />

        <OrganizationSelector collapsed={collapsed} />

        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Primary">
          {NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.id}
              id={group.id}
              title={group.title}
              collapsed={collapsed}
              expanded={expandedGroups[group.id] ?? true}
              onToggle={toggleNavGroup}
            >
              {group.items.map((item) => (
                <SidebarItem key={item.to} to={item.to} label={item.label} icon={item.icon} collapsed={collapsed} />
              ))}
            </SidebarGroup>
          ))}
        </nav>

        {/* Bottom utility rail */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-utility-btn"
            onClick={() => toast.info('CRISPR Docs', 'Documentation portal would open in a new tab.')}
            aria-label="Help and documentation"
            title={collapsed ? 'Help' : undefined}
          >
            <HelpCircle size={17} strokeWidth={1.8} />
            {!collapsed && <span>Help</span>}
            {collapsed && <span className="nav-tooltip" role="tooltip">Help</span>}
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-utility-btn sidebar-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <ChevronsRight size={17} strokeWidth={1.8} /> : <ChevronsLeft size={17} strokeWidth={1.8} />}
            {!collapsed && <span>Collapse</span>}
            {collapsed && <span className="nav-tooltip" role="tooltip">Expand sidebar</span>}
          </button>
        </div>

        {!collapsed && <SidebarResizer currentWidth={width} />}
      </aside>
    </>
  );
}
