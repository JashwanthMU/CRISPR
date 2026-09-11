import { useState } from 'react';
import { useLanguage } from '../../lib/i18n';
import { Search } from 'lucide-react';
import { openCommandPalette } from '../../lib/uiStore';

/**
 * Compact search field that expands smoothly on focus and opens the full
 * Command Palette on click/focus (the palette owns the actual search-and-
 * navigate logic, so there's a single implementation of "search the app").
 * Ctrl/Cmd+K is wired globally in App.tsx.
 */
export default function GlobalSearch() {
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);

  return (
    <button
      type="button"
      className={`topbar-search${focused ? ' focused' : ''}`}
      onClick={openCommandPalette}
      onFocus={() => {
        setFocused(true);
        openCommandPalette();
      }}
      onBlur={() => setFocused(false)}
      aria-label={t('Search assets, findings, CVEs, repositories...')}
    >
      <Search size={15} className="topbar-search-icon" />
      <span className="topbar-search-placeholder">{t('Search assets, findings, CVEs, repositories...')}</span>
    </button>
  );
}
