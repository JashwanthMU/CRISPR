import { Sparkles } from 'lucide-react';
import { openAIDrawer } from '../../lib/uiStore';

/** Compact enterprise "Ask CRISPR AI" trigger — opens the right-side AI assistant drawer. */
export default function AskAIButton() {
  return (
    <button type="button" className="topbar-ai-btn" onClick={openAIDrawer} aria-label="Ask CRISPR AI">
      <Sparkles size={14} />
      <span>Ask CRISPR AI</span>
    </button>
  );
}
