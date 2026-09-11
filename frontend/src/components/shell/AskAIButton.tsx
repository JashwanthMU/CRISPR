import { useLanguage } from '../../lib/i18n';
import { Sparkles } from 'lucide-react';
import { openAIDrawer } from '../../lib/uiStore';

/** Compact enterprise "Ask CRISPR AI" trigger — opens the right-side AI assistant drawer. */
export default function AskAIButton() {
  const { t } = useLanguage();
  return (
    <button type="button" className="topbar-ai-btn" onClick={openAIDrawer} aria-label={t("Ask CRISPR AI")} title={t("Ask CRISPR AI")}>
      <Sparkles size={14} />
      <span>{t("Ask CRISPR AI")}</span>
    </button>
  );
}
