import { useLanguage } from '../../lib/i18n';
import LanguageSelector from '../common/LanguageSelector';
import { useEffect, useState } from 'react';
import { Menu, RefreshCw, Download, Play, Loader2 } from 'lucide-react';
import { toggleMobileNav } from '../../lib/uiStore';
import { toast } from '../../lib/toastStore';
import Breadcrumbs from './Breadcrumbs';
import ProjectSelector from './ProjectSelector';
import GlobalSearch from './GlobalSearch';
import AskAIButton from './AskAIButton';
import RecentActivity from './RecentActivity';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import { httpClient, runAnalysis as runBackendAnalysis } from '../../lib/api';
import { openAIDrawer } from '../../lib/uiStore';
import { getWorkspace, SIH_WORKSPACE_ENABLED } from '../../lib/workspace';

/**
 * Top header / global control bar. LEFT = project selector + breadcrumbs,
 * CENTER = global search, RIGHT = Ask AI / Activity / Status / Notifications
 * / Refresh / Export / Run Analysis / Profile. Sticky with a scroll-driven
 * elevation (shadow appears once main content scrolls past the top).
 */
export default function TopHeader() {
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.querySelector('.app-main main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 2);
    main.addEventListener('scroll', onScroll);
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info('Refreshing dashboard data…');
    try {
      await httpClient.post('/api/ingestion/refresh');
      toast.success('Dashboard refreshed');
      window.dispatchEvent(new CustomEvent('crispr:data-refresh'));
    } catch {
      toast.error('Refresh failed', 'The backend could not refresh ingestion data.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    try {
      await httpClient.post('/api/reports', { report_type: 'RISK_SUMMARY', name: 'CRISPR Security Report', format: 'JSON' });
      toast.success('Report requested', 'The generated report will appear in Reports.');
    } catch {
      toast.error('Export failed', 'The backend could not create the report.');
    }
  };

  const handleRunAnalysis = async () => {
    setAnalysisPending(true);
    try {
      const analysis = await runBackendAnalysis();
      if (analysis.id) {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const job = (await httpClient.get(`/api/analysis/jobs/${analysis.id}`)).data;
          if (job.status === 'SUCCEEDED') break;
          if (job.status === 'FAILED') throw new Error(job.error || 'Risk analysis failed');
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
        }
      }
      const workspace = SIH_WORKSPACE_ENABLED ? getWorkspace() : 'technical';
      window.dispatchEvent(new CustomEvent('crispr:data-refresh'));
      openAIDrawer();
      window.dispatchEvent(new CustomEvent('crispr:ai-prompt', {
        detail: workspace === 'executive'
          ? 'Run a complete executive dashboard analysis. Explain our overall financial exposure, highest business risks, major risk drivers, compliance impact, investment priorities, and the next actions leadership should approve.'
          : 'Run a complete technical dashboard analysis. Explain our overall security posture, critical and high findings, exposed assets, highest-risk cases, control weaknesses, remediation priorities, and the next actions the security team should take.',
      }));
      toast.success('Analysis ready', 'CRISPR AI is explaining the current dashboard.');
    } catch {
      toast.error('Analysis failed', 'The backend did not accept the analysis job.');
    } finally {
      setAnalysisPending(false);
    }
  };

  return (
    <header className={`app-topheader${scrolled ? ' topbar-scrolled' : ''}`}>
      <button className="icon-btn mobile-menu-btn" onClick={toggleMobileNav} aria-label={t("Open navigation menu")}>
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
        <LanguageSelector />
        <AskAIButton />
        <RecentActivity />

        <div className="topbar-vdivider" />

        <button className="icon-btn mobile-header-secondary" onClick={handleRefresh} aria-label={t("Refresh dashboard data")} title={t("Refresh")}>
          <RefreshCw size={16} style={refreshing ? { animation: 'spin-refresh 0.8s linear infinite' } : undefined} />
        </button>
        <button className="icon-btn mobile-header-secondary" onClick={handleExport} aria-label={t("Export report")} title={t("Export")}>
          <Download size={16} />
        </button>
        <button
          className="btn-primary run-analysis-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 132, justifyContent: 'center' }}
          onClick={handleRunAnalysis}
          disabled={analysisPending}
          aria-label={t("Run Analysis")}
        >
          {analysisPending ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin-refresh 0.8s linear infinite' }} />
              <span className="run-analysis-label">{t("Starting…")}</span>
            </>
          ) : (
            <>
              <Play size={14} /> <span className="run-analysis-label">{t("Run Analysis")}</span>
            </>
          )}
        </button>

        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
