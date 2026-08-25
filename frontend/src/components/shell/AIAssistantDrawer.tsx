import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bot, Send, Sparkles, ShieldAlert, Globe, TrendingUp, ScrollText } from 'lucide-react';
import { useUiStore, closeAIDrawer } from '../../lib/uiStore';
import { queryAssistant } from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_PROMPTS = [
  { icon: ShieldAlert, text: 'Explain my highest-risk finding' },
  { icon: Globe, text: 'Show exposed assets' },
  { icon: TrendingUp, text: 'Why did risk increase?' },
  { icon: ScrollText, text: "Summarize today's security activity" },
];

/**
 * Global, always-available AI assistant — distinct from the per-page
 * AIAdvisorChat (security/financial themed cards already embedded in
 * dashboards). This one lives in the application shell, is reachable from
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

  const unavailableAnswer = "The AI Advisor cannot reach the deterministic backend for this question. Start the backend and retry so I can answer from current risk data.";

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await queryAssistant(question);
      const answer = res?.data?.answer || res?.data?.response || unavailableAnswer;
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: unavailableAnswer }]);
    } finally {
      setLoading(false);
    }
  };

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
              <p>Ask me anything about NovaPay's current security or financial risk posture.</p>
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
