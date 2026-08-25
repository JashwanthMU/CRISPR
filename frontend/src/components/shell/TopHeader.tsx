import { useEffect, useState } from 'react';
import { Menu, RefreshCw, Download, Play, Loader2 } from 'lucide-react';
import { toggleMobileNav } from '../../lib/uiStore';
import { useDemoStore, runAnalysis } from '../../demo/demoStore';
import { toast } from '../../lib/toastStore';
import Breadcrumbs from './Breadcrumbs';
import ProjectSelector from './ProjectSelector';
import GlobalSearch from './GlobalSearch';
import AskAIButton from './AskAIButton';
import RecentActivity from './RecentActivity';
import SystemStatus from './SystemStatus';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

/**
 * Top header / global control bar. LEFT = project selector + breadcrumbs,
 * CENTER = global search, RIGHT = Ask AI / Activity / Status / Notifications
 * / Refresh / Export / Run Analysis / Profile. Sticky with a scroll-driven
 * elevation (shadow appears once main content scrolls past the top).
 */
export default function TopHeader() {
  const isRunning = useDemoStore((s) => s.isRunning);
  const progressPct = useDemoStore((s) => s.progressPct);
  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.querySelector('.app-main main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 2);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    toast.info('Refreshing dashboard data…');
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Dashboard refreshed');
    }, 900);
  };

  const handleExport = () => {
    toast.success('Export started', 'crispr-security-report.pdf will download shortly.');
  };

  return (
    <header className={`app-topheader${scrolled ? ' topbar-scrolled' : ''}`}>
      <button className="icon-btn mobile-menu-btn" onClick={toggleMobileNav} aria-label="Open navigation menu">
        <Menu size={18} />
      </button>

      <div className="topheader-left">
        <ProjectSelector />
        <Breadcrumbs />
      </div>

      <div className="topheader-center">
        <GlobalSearch />
      </div>

      <div className="topheader-right">
        <AskAIButton />
        <RecentActivity />
        <SystemStatus />

        <div className="topbar-vdivider" />

        <button className="icon-btn" onClick={handleRefresh} aria-label="Refresh dashboard data" title="Refresh">
          <RefreshCw size={16} style={refreshing ? { animation: 'spin-refresh 0.8s linear infinite' } : undefined} />
        </button>
        <button className="icon-btn" onClick={handleExport} aria-label="Export report" title="Export">
          <Download size={16} />
        </button>
        <button
          className="btn-primary run-analysis-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 132, justifyContent: 'center' }}
          onClick={() => runAnalysis()}
          disabled={isRunning}
          aria-label="Run Analysis"
        >
          {isRunning ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin-refresh 0.8s linear infinite' }} />
              <span className="run-analysis-label">{progressPct}%</span>
            </>
          ) : (
            <>
              <Play size={14} /> <span className="run-analysis-label">Run Analysis</span>
            </>
          )}
        </button>

        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
