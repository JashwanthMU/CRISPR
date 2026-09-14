import { ReactNode, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
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

  // Route transitions always begin at the page heading. This also prevents a
  // freshly authenticated user from inheriting the previous page's scroll.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    closeMobileNav();
  }, [location.pathname]);

  // Refresh and Run Analysis emit this event after backend completion. Remount
  // the active page so all page-local queries reload from one shared signal.
  useEffect(() => {
    const refresh = () => setRefreshVersion((version) => version + 1);
    window.addEventListener('crispr:data-refresh', refresh);
    return () => window.removeEventListener('crispr:data-refresh', refresh);
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
        <main ref={mainRef}><div key={refreshVersion}>{children}</div></main>
      </div>
      <AIAssistantDrawer />
    </div>
  );
}
