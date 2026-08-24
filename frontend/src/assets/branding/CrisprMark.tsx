// ============================================================================
// CRISPR mark — centralized SVG brand asset.
// ----------------------------------------------------------------------------
// A flat, geometric mark in the style of Google's own product icons
// (Google Cloud, Workspace apps): simple layered shapes, restrained two-tone
// blue, no gradients/glow/photographic elements. Reads as "a shield built
// from data" — a rounded shield silhouette containing a data/pulse chevron.
//
// All CRISPR logo usages (sidebar, top bar, command palette, loading state,
// demo pages, favicon) render through this one file so the mark is defined
// exactly once. See src/components/common/Logo.tsx for the wrapper that
// combines this mark with the wordmark.
// ============================================================================

interface MarkProps {
  size?: number;
  /** Render as flat single-color (used on dark surfaces like the terminal/demo header) */
  mono?: boolean;
}

export function CrisprMark({ size = 24, mono = false }: MarkProps) {
  const primary = mono ? '#ffffff' : '#1a73e8';
  // Dark blue (#1557B0) — the strict CRISPR palette does not include #4285F4.
  const secondary = mono ? '#ffffff' : '#1557b0';

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill={mono ? 'transparent' : '#e8f0fe'} />
      <path
        d="M12 4.5L6.5 6.7V11.6C6.5 15.1 8.8 18.3 12 19.4C15.2 18.3 17.5 15.1 17.5 11.6V6.7L12 4.5Z"
        fill={primary}
        opacity={mono ? 1 : 0.14}
      />
      <path
        d="M12 4.5L6.5 6.7V11.6C6.5 15.1 8.8 18.3 12 19.4C15.2 18.3 17.5 15.1 17.5 11.6V6.7L12 4.5Z"
        stroke={primary}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9 12.3L11 14.3L15 9.7" stroke={secondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Compact square variant for favicon / very small chrome (16-20px). */
export function CrisprMarkCompact({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="16" height="16" rx="4" fill="#1a73e8" />
      <path d="M5 8.3L7 10.2L11 5.8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default CrisprMark;
