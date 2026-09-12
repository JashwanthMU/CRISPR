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
import { EXECUTIVE_NAV_GROUPS, NAV_GROUPS, TECHNICAL_NAV_GROUPS } from './navConfig';
import SidebarGroup from './SidebarGroup';
import SidebarItem from './SidebarItem';
import SidebarResizer from './SidebarResizer';
import OrganizationSelector from './OrganizationSelector';
import { CrisprMark } from '../../assets/branding/CrisprMark';
import { BRAND } from '../../config/branding';
import { getEffectiveWorkspace, SIH_WORKSPACE_ENABLED } from '../../lib/workspace';
import SidebarTooltip from './SidebarTooltip';

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
  const visuallyCollapsed = collapsed && !mobileNavOpen;

  const effectiveWidth = visuallyCollapsed ? SIDEBAR_COLLAPSED_WIDTH : width;
  const workspace = getEffectiveWorkspace();
  const navGroups = SIH_WORKSPACE_ENABLED ? (workspace === 'executive' ? EXECUTIVE_NAV_GROUPS : TECHNICAL_NAV_GROUPS) : NAV_GROUPS;

  return (
    <>
      {mobileNavOpen && (
        <div className="mobile-nav-overlay" onClick={closeMobileNav} aria-hidden="true" />
      )}
      <aside
        className={`app-sidebar${visuallyCollapsed ? ' sidebar-collapsed' : ''}${mobileNavOpen ? ' mobile-nav-open' : ''}`}
        style={{ width: effectiveWidth }}
        aria-label="Primary navigation"
      >
        {/* Brand header */}
        <SidebarTooltip label={`${BRAND.name} — ${BRAND.tagline}`} enabled={visuallyCollapsed}>
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => {
            navigate(SIH_WORKSPACE_ENABLED && workspace === 'executive' ? '/executive' : '/security');
            closeMobileNav();
          }}
          aria-label={`${BRAND.name} — go to Security Dashboard`}
        >
          {visuallyCollapsed ? <CrisprMark size={40} /> : <CrisprMark size={28} />}
          {!visuallyCollapsed && (
            <span className="sidebar-brand-text">
              <span className="sidebar-brand-name">{BRAND.name}</span>
              <span className="sidebar-brand-tagline">{BRAND.tagline}</span>
            </span>
          )}
        </button>
        </SidebarTooltip>

        <div className="sidebar-divider" />

        <OrganizationSelector collapsed={visuallyCollapsed} />

        <div className="sidebar-divider" />

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Primary">
          {navGroups.map((group) => (
            <SidebarGroup
              key={group.id}
              id={group.id}
              title={group.title}
              collapsed={visuallyCollapsed}
              expanded={expandedGroups[group.id] ?? true}
              onToggle={toggleNavGroup}
            >
              {group.items.map((item) => (
                <SidebarItem key={item.to} to={item.to} label={item.label} icon={item.icon} collapsed={visuallyCollapsed} />
              ))}
            </SidebarGroup>
          ))}
        </nav>

        {/* Bottom utility rail */}
        <div className="sidebar-footer">
          <SidebarTooltip label="Help" enabled={visuallyCollapsed}>
          <button
            type="button"
            className="sidebar-utility-btn"
            onClick={() => toast.info('CRISPR Docs', 'Documentation portal would open in a new tab.')}
            aria-label="Help and documentation"
          >
            <HelpCircle size={17} strokeWidth={1.8} />
            {!visuallyCollapsed && <span>Help</span>}
          </button>
          </SidebarTooltip>
          <SidebarTooltip label="Expand sidebar" enabled={visuallyCollapsed}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-utility-btn sidebar-collapse-btn"
            aria-label={visuallyCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!visuallyCollapsed}
          >
            {visuallyCollapsed ? <ChevronsRight size={17} strokeWidth={1.8} /> : <ChevronsLeft size={17} strokeWidth={1.8} />}
            {!visuallyCollapsed && <span>Collapse</span>}
          </button>
          </SidebarTooltip>
        </div>

        {!visuallyCollapsed && <SidebarResizer currentWidth={width} />}
      </aside>
    </>
  );
}
