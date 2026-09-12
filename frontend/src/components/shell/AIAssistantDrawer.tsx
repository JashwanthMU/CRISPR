import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bot, Send, Sparkles, ShieldAlert, Globe, TrendingUp, ScrollText } from 'lucide-react';
import { useUiStore, closeAIDrawer } from '../../lib/uiStore';
import { queryAssistant } from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  references?: Array<{ label: string; path: string }>;
}

const SUGGESTED_PROMPTS = [
  { icon: ShieldAlert, text: 'Explain my highest-risk finding' },
  { icon: Globe, text: 'Show exposed assets' },
  { icon: TrendingUp, text: 'Why did risk increase?' },
  { icon: ScrollText, text: "Summarize today's security activity" },
];

const NETWORK_FALLBACKS = [
  {
    matches: ['highest-risk', 'highest risk', 'top risk', 'biggest risk'],
    text: 'Live risk analysis is temporarily unavailable. Open Risk Cases and sort by Expected Annual Loss; review the highest item’s incident-frequency evidence, loss magnitude, asset criticality, and control gaps before prioritizing it.',
    references: [{ label: 'View Risk Cases', path: '/risks' }],
  },
  {
    matches: ['exposed asset', 'internet-facing', 'internet facing', 'public-facing'],
    text: 'Live asset analysis is temporarily unavailable. Open Assets and filter for internet-facing resources, then review exploitable findings, privileged access, missing controls, business criticality, and evidence freshness.',
    references: [{ label: 'View Assets', path: '/assets' }],
  },
  {
    matches: ['risk increase', 'risk increased', 'exposure increase', 'why did risk'],
    text: 'Live trend analysis is temporarily unavailable. Check dated risk snapshots for new findings, newly exposed assets, threat-intelligence changes, weakened controls, stale evidence, and overdue remediation before attributing the increase.',
    references: [{ label: 'View Risk Cases', path: '/risks' }],
  },
  {
    matches: ['security activity', 'activity summary', "today's activity", 'todays activity'],
    text: "Live activity analysis is temporarily unavailable. Review Findings for newly detected critical or high items and the Developer Queue for assignments, status changes, overdue work, and remediation-verification results.",
    references: [{ label: 'View Findings', path: '/findings' }, { label: 'View Queue', path: '/remediation-queue' }],
  },
  {
    matches: ['mfa', 'multi-factor', 'multifactor'],
    text: 'The scenario service is temporarily unavailable. MFA normally reduces credential and privileged-access risk, but CRISPR will not estimate financial reduction until the deterministic scenario engine reconnects.',
    references: [{ label: 'Open Scenarios', path: '/scenarios' }],
  },
  {
    matches: ['budget', 'invest', 'spend', 'optimiz'],
    text: 'The optimization service is temporarily unavailable. Review Recommendations by verified marginal risk reduction, implementation cost, overlap with other controls, and delivery constraints; no investment value will be estimated offline.',
    references: [{ label: 'View Recommendations', path: '/recommendations' }],
  },
  {
    matches: ['full dashboard', 'entire dashboard', 'complete executive', 'complete technical'],
    text: 'The complete live analysis is temporarily unavailable. Dashboard data remains visible; review top financial exposures, critical findings, exposed assets, overdue remediation, control gaps, and evidence freshness. CRISPR will not fabricate a summary while disconnected.',
    references: [{ label: 'View Risk Cases', path: '/risks' }, { label: 'View Findings', path: '/findings' }],
  },
];

function networkFallback(question: string): Pick<Message, 'text' | 'references'> {
  const normalized = question.toLowerCase();
  const match = NETWORK_FALLBACKS.find((entry) => entry.matches.some((term) => normalized.includes(term)));
  return match ?? {
    text: 'CRISPR AI cannot reach the analysis service because of a network or provider issue. Core dashboards remain available. Retry shortly or use Risk Cases, Findings, Scenarios, and Recommendations directly; no financial values will be invented while disconnected.',
    references: [{ label: 'View Risk Cases', path: '/risks' }, { label: 'View Findings', path: '/findings' }],
  };
}

/**
 * Global, always-available AI assistant. It lives in the application shell, is reachable from
 * any page via the header's "Ask CRISPR AI" button or Ctrl+/ shortcut area,
 * and answers using the same live demo-engine state (risk score, run count)
 * so its responses are grounded in real, current application state rather
 * than being a static transcript.
 */
export default function AIAssistantDrawer() {
  const open = useUiStore((s) => s.aiDrawerOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closeAIDrawer();
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await queryAssistant(question);
      const fallback = networkFallback(question);
      const answer = res?.data?.answer || res?.data?.response || fallback.text;
      const evidence = res?.data?.data ?? {};
      const risk = evidence.top_risk ?? evidence.risk_case ?? evidence.summary?.top_risk;
      const references = risk?.asset_id ? [
        { label: `Risk ${risk.finding_id ?? risk.asset_id}`, path: `/risks?asset=${encodeURIComponent(risk.asset_id)}` },
        ...(risk.finding_id ? [{ label: `Finding ${risk.finding_id}`, path: `/findings?finding=${encodeURIComponent(risk.finding_id)}` }] : []),
      ] : (!res?.data?.answer && !res?.data?.response ? fallback.references : []);
      setMessages((m) => [...m, { role: 'assistant', text: answer, references }]);
    } catch {
      const fallback = networkFallback(question);
      setMessages((m) => [...m, { role: 'assistant', ...fallback }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const runPrompt = (event: Event) => {
      const question = (event as CustomEvent<string>).detail;
      if (typeof question === 'string' && question.trim()) void send(question);
    };
    window.addEventListener('crispr:ai-prompt', runPrompt);
    return () => window.removeEventListener('crispr:ai-prompt', runPrompt);
  });

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={closeAIDrawer} />
      <div className="ai-drawer" role="dialog" aria-modal="true" aria-label="CRISPR AI Assistant">
        <div className="ai-drawer-header">
          <div className="ai-drawer-title">
            <Bot size={18} color="var(--color-primary-blue)" />
            <span>CRISPR AI</span>
            <span className="ai-drawer-badge">
              <Sparkles size={10} /> Beta
            </span>
          </div>
          <button className="icon-btn" onClick={closeAIDrawer} aria-label="Close AI assistant">
            <X size={16} />
          </button>
        </div>

        <div className="ai-drawer-body">
          {messages.length === 0 && (
            <div className="ai-drawer-empty">
              <Bot size={28} color="var(--color-primary-blue)" />
              <p>Ask me anything about the organization’s current security or financial risk posture.</p>
              <div className="ai-drawer-suggestions">
                {SUGGESTED_PROMPTS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button key={p.text} className="ai-drawer-suggestion" onClick={() => send(p.text)}>
                      <Icon size={14} />
                      <span>{p.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`ai-drawer-message ${m.role}`}>
              {m.text}
              {!!m.references?.length && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {m.references.map((reference) => (
                    <button key={reference.path} className="btn-secondary" style={{ padding: '3px 7px', fontSize: '0.6875rem' }} onClick={() => { closeAIDrawer(); navigate(reference.path); }}>
                      {reference.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && <div className="ai-drawer-message assistant">Analyzing…</div>}
          <div ref={bottomRef} />
        </div>

        <form
          className="ai-drawer-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={inputRef}
            className="input-field"
            style={{ flex: 1 }}
            placeholder="Ask CRISPR AI a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={loading} aria-label="Send">
            <Send size={14} />
          </button>
        </form>

        {messages.length > 0 && (
          <div className="ai-drawer-footer-actions">
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={() => navigate('/risks')}>
              View Risk Cases
            </button>
            <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '5px 10px' }} onClick={() => navigate('/findings')}>
              View Findings
            </button>
          </div>
        )}
      </div>
    </>
  );
}
