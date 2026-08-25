import { ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import AIAssistantDrawer from './AIAssistantDrawer';
import { useUiStore, closeMobileNav, closeAllOverlays, SIDEBAR_COLLAPSED_WIDTH } from '../../lib/uiStore';

interface Props {
  children: ReactNode;
}

/**
 * Application shell: fixed icon-rail/sidebar on the left, sticky top header,
 * and the routed page content on the right. Uses CSS flex/grid offsets
 * driven by the sidebar's actual current width (not a hardcoded margin) so
 * every dashboard page's charts/tables/grids reflow automatically whenever
 * the sidebar collapses, expands, or is resized.
 */
export default function AppShell({ children }: Props) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const width = useUiStore((s) => s.sidebarWidth);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const effectiveWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : width;

  // Global Escape closes any open overlay (popover, command palette, AI
  // drawer, mobile nav) — implemented once at the shell level rather than
  // duplicated per-component.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllOverlays();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close the mobile drawer automatically on route change via popstate/click
  // is already handled per-nav-item (SidebarItem calls closeMobileNav on
  // click); this covers back/forward browser navigation too.
  useEffect(() => {
    const onPopState = () => closeMobileNav();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="app-shell" style={{ '--sidebar-width': `${effectiveWidth}px` } as React.CSSProperties}>
      <Sidebar />
      <div className={`app-main${mobileNavOpen ? ' mobile-nav-active' : ''}`}>
        <TopHeader />
        <main>{children}</main>
      </div>
      <AIAssistantDrawer />
    </div>
  );
}
