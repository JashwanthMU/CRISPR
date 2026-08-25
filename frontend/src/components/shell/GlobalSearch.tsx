import { useState } from 'react';
import { Search } from 'lucide-react';
import { openCommandPalette } from '../../lib/uiStore';

/**
 * Compact search field that expands smoothly on focus and opens the full
 * Command Palette on click/focus (the palette owns the actual search-and-
 * navigate logic, so there's a single implementation of "search the app").
 * Ctrl/Cmd+K is wired globally in App.tsx.
 */
export default function GlobalSearch() {
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
      aria-label="Search assets, findings, CVEs, repositories (Ctrl+K)"
    >
      <Search size={15} className="topbar-search-icon" />
      <span className="topbar-search-placeholder">Search assets, findings, CVEs, repositories...</span>
      <span className="kbd topbar-search-kbd">Ctrl K</span>
    </button>
  );
}
