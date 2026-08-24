import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { queryAssistant } from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  theme: 'security' | 'financial';
  suggestions: string[];
}

const FALLBACK_RESPONSES: Record<string, string> = {
  default:
    "Based on current risk data, the Authentication API is NovaPay's top exposure at ₹79.8L EAL (risk score 87), driven by a validated bug bounty finding, weak MFA coverage, and its internet-facing critical role in Digital Payments. I'd recommend prioritizing MFA enforcement — it alone would reduce EAL by ~₹48.6L for a ₹15L investment (ROSI 224%).",
};

function mockAnswer(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('top') && q.includes('risk')) {
    return 'Your top security risk is the Authentication API — risk score 87, EAL ₹79.8L. It is correlated across 4 independent sources (Bug Bounty, Vulnerability Scanner, XDR, and IAM), giving 94% confidence this is a real, active exposure, not a false positive.';
  }
  if (q.includes('auth')) {
    return 'Authentication API is high risk because it is internet-facing, supports a critical business service (Digital Payments), has a validated bug bounty auth-bypass finding, and only 58% MFA coverage on privileged accounts. Multiple independent telemetry sources corroborate this — that correlation is what drives the 87/100 score.';
  }
  if (q.includes('exploit')) {
    return 'CVE-2024-21887 (Authentication API) and CVE-2024-3400 (Payment Database) are both flagged by threat intel as actively exploited in the wild by known threat actor groups targeting APAC payment infrastructure. Both are CRITICAL severity and should be patched immediately.';
  }
  if (q.includes('mfa')) {
    return 'Enabling MFA everywhere would cut Authentication API EAL from ₹79.8L to roughly ₹31.2L — a ₹48.6L annual risk reduction — for an estimated ₹15L implementation cost. That is a 224% ROSI, the single highest-return action available right now.';
  }
  if (q.includes('crore') || q.includes('budget') || (q.includes('1') && q.includes('cr'))) {
    return "With a ₹1 crore (₹100L) budget, the optimizer selects MFA rollout, emergency patching, network segmentation, WAF deployment, and full EDR rollout — total spend ₹86L, delivering ₹161.3L in risk reduction (ROSI ~620%), with ₹14L of budget left unused because no further control passes the cost-benefit threshold.";
  }
  if (q.includes('delay') && q.includes('patch')) {
    return 'Delaying patching by 30 days on CVE-2024-21887 increases Authentication API EAL by approximately ₹21L, as the exploitation window and threat actor dwell time both grow. We recommend patching immediately rather than deferring.';
  }
  if (q.includes('exposure') && q.includes('total')) {
    return "NovaPay's total financial cyber exposure (Expected Annual Loss) is ₹84.0L across all monitored assets, with a 95th-percentile Value-at-Risk of ₹2.69 Cr in a worst-case scenario year.";
  }
  if (q.includes('business service') || q.includes('highest exposure')) {
    return 'Digital Payments is the business service with the highest exposure — it includes the Authentication API and Payment Database, together accounting for roughly ₹141.8L of the ₹84L+ enterprise EAL.';
  }
  return FALLBACK_RESPONSES.default;
}

export default function AIAdvisorChat({ theme, suggestions }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const accent = theme === 'security' ? 'var(--color-primary-blue)' : 'var(--color-success)';

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await queryAssistant(question);
      const answer = res?.data?.answer || res?.data?.response || mockAnswer(question);
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: mockAnswer(question) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={18} color={accent} />
          <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
            CRISPR {theme === 'security' ? 'Security' : 'Financial'} Advisor
          </span>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.6875rem',
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 9999,
            background: 'var(--color-light-blue)',
            color: 'var(--color-primary-blue)',
          }}
        >
          <Sparkles size={10} /> Powered by AI
        </span>
      </div>

      <div
        style={{
          minHeight: 140,
          maxHeight: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 12,
          padding: messages.length ? '4px 4px' : 0,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '8px 0' }}>
            Ask me anything about NovaPay's cyber risk posture — try one of the suggestions below.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '78%',
              background: m.role === 'user' ? accent : 'var(--bg-elevated)',
              color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
              borderLeft: m.role === 'assistant' ? `3px solid ${accent}` : 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: 'flex-start',
              borderLeft: `3px solid ${accent}`,
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}
          >
            Analyzing<span className="dots-anim">...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {suggestions.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          className="input-field"
          style={{ flex: 1 }}
          placeholder="Ask the AI advisor a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
