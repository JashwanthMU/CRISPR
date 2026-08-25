import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileWarning, Building2, AlertTriangle, GitBranch, ScrollText, LayoutDashboard, Bug, Sparkles } from 'lucide-react';
import { useUiStore, closeCommandPalette, openAIDrawer } from '../../lib/uiStore';
import { MOCK_FINDINGS, MOCK_ASSETS, MOCK_RISKS } from '../../utils/mock';
import { REPOSITORIES } from '../../demo/fixtures';
import { NAV_GROUPS } from '../shell/navConfig';
import { runAnalysis } from '../../demo/demoStore';
import type { CommandResult, CommandResultType } from '../../types';

// "Pages" results are derived from the single shared nav config (see
// src/components/shell/navConfig.tsx) instead of a second hardcoded list,
// so the sidebar and command palette can never drift out of sync.
const PAGE_RESULTS: CommandResult[] = NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    id: `page-${item.to}`,
    type: 'page' as const,
    title: item.label,
    subtitle: group.title,
    path: item.to,
  }))
);

// "Actions" — real commands, not just navigation. Selecting one performs
// the action directly instead of only opening a page.
interface ActionResult {
  id: string;
  type: 'action';
  title: string;
  subtitle: string;
  run: () => void;
}

const ACTION_RESULTS: ActionResult[] = [
  { id: 'action-ai', type: 'action', title: 'Ask CRISPR AI', subtitle: 'Open the AI assistant', run: () => openAIDrawer() },
  { id: 'action-run', type: 'action', title: 'Run Analysis', subtitle: 'Trigger a full ingestion → correlation → risk scan', run: () => runAnalysis() },
];

const TYPE_ICON: Record<CommandResultType | 'action', any> = {
  asset: Building2,
  finding: FileWarning,
  risk_case: AlertTriangle,
  repository: GitBranch,
  vulnerability: Bug,
  report: ScrollText,
  page: LayoutDashboard,
  user: Building2,
  action: Sparkles,
};

const RECENT_KEY = 'crispr_recent_searches';

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  if (!term.trim()) return;
  const recent = [term, ...getRecent().filter((r) => r !== term)].slice(0, 5);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    /* ignore quota errors */
  }
}

export default function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  type AnyResult = CommandResult | ActionResult;

  const results: AnyResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actionMatches = ACTION_RESULTS.filter((a) => !q || a.title.toLowerCase().includes(q));

    if (!q) return [...PAGE_RESULTS, ...actionMatches];

    const assetResults: CommandResult[] = MOCK_ASSETS.filter((a) => a.name.toLowerCase().includes(q)).map((a) => ({
      id: a.asset_id,
      type: 'asset',
      title: a.name,
      subtitle: a.business_service,
      path: `/assets`,
    }));
    const findingResults: CommandResult[] = MOCK_FINDINGS.filter(
      (f) => f.title.toLowerCase().includes(q) || f.finding_id.toLowerCase().includes(q) || f.cve?.toLowerCase().includes(q)
    ).map((f) => ({
      id: f.finding_id,
      type: 'finding',
      title: f.title,
      subtitle: `${f.finding_id}${f.cve ? ' · ' + f.cve : ''}`,
      path: `/findings`,
    }));
    const riskResults: CommandResult[] = MOCK_RISKS.filter((r) => r.asset_name.toLowerCase().includes(q)).map((r) => ({
      id: r.asset_id,
      type: 'risk_case',
      title: r.asset_name,
      subtitle: `Risk score ${r.risk_score}`,
      path: `/risks`,
    }));
    const repoResults: CommandResult[] = REPOSITORIES.filter((r) => r.name.toLowerCase().includes(q)).map((r) => ({
      id: r.id,
      type: 'repository',
      title: r.name,
      subtitle: `Security score ${r.securityScore}`,
      path: `/code-security/repositories/${r.id}`,
    }));
    const pageResults = PAGE_RESULTS.filter((p) => p.title.toLowerCase().includes(q));

    return [...pageResults, ...assetResults, ...riskResults, ...findingResults, ...repoResults, ...actionMatches].slice(0, 20);
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, AnyResult[]> = {};
    results.forEach((r) => {
      const key = r.type;
      groups[key] = groups[key] ?? [];
      groups[key].push(r);
    });
    return groups;
  }, [results]);

  const flatResults = results;

  const goTo = (result: AnyResult) => {
    pushRecent(query || result.title);
    closeCommandPalette();
    if (result.type === 'action') {
      result.run();
    } else {
      navigate(result.path);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = flatResults[activeIndex];
        if (r) goTo(r);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, flatResults]);

  if (!open) return null;

  const recent = getRecent();
  let runningIndex = -1;

  const GROUP_LABEL: Record<string, string> = {
    page: 'Pages',
    asset: 'Assets',
    finding: 'Findings',
    risk_case: 'Risk Cases',
    repository: 'Repositories',
    vulnerability: 'Vulnerabilities',
    report: 'Reports',
    user: 'Users',
    action: 'Actions',
  };

  return (
    <div className="command-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeCommandPalette(); }}>
      <div className="command-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="command-input-row">
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            placeholder="Search assets, findings, CVEs, repositories..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            aria-label="Command palette search"
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="command-results">
          {!query && recent.length > 0 && (
            <div>
              <div className="command-group-label">Recent Searches</div>
              {recent.map((term) => (
                <div key={term} className="command-result-row" onClick={() => setQuery(term)}>
                  <Search size={14} color="var(--text-muted)" />
                  <span>{term}</span>
                </div>
              ))}
            </div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="command-group-label">{GROUP_LABEL[type] ?? type}</div>
              {(items as AnyResult[]).map((r) => {
                runningIndex += 1;
                const idx = runningIndex;
                const Icon = TYPE_ICON[r.type];
                return (
                  <div
                    key={r.id + r.type}
                    className={`command-result-row${idx === activeIndex ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goTo(r)}
                  >
                    <Icon size={15} color="var(--text-muted)" />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                      {r.subtitle && <div className="command-result-sub">{r.subtitle}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {results.length === 0 && (
            <div className="empty-state">
              <Search size={20} />
              <span>No results for "{query}"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
