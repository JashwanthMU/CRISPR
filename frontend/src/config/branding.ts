// ============================================================================
// Centralized brand configuration.
// ----------------------------------------------------------------------------
// Single source of truth for product naming, tagline, and the sizes/usages
// of the CRISPR mark across the app (sidebar, top bar, command palette,
// loading screen, favicon). Visual design only — no business logic here.
// ============================================================================

export const BRAND = {
  name: 'CRISPR',
  tagline: 'Security Intelligence Platform',
  organization: 'NovaPay Financial Services',
  colorPrimary: '#1a73e8',
  colorSecondary: '#1557b0', // dark blue — #4285F4 is not part of the strict CRISPR palette
} as const;

/** Standardized mark sizes so the logo never appears at ad-hoc dimensions. */
export const LOGO_SIZES = {
  favicon: 32,
  sidebarExpanded: 28,
  sidebarCollapsed: 24,
  topbar: 22,
  commandPalette: 20,
  loading: 40,
  demo: 22,
} as const;
