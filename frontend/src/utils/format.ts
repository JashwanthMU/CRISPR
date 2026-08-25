export const formatRupees = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const formatLakh = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `₹${v.toFixed(1)}L`;
};

// Design-system color primitives — kept in strict sync with the CRISPR
// palette declared in src/index.css. THESE ARE THE ONLY COLORS PERMITTED
// ANYWHERE IN THE APPLICATION:
//   primaryBlue #1A73E8 · primaryDark #1557B0 · lightBlue #E8F0FE
//   blueSurface #F3F7FF · bg #FFFFFF · textPrimary #202124
//   textSecondary #5F6368 · border #DADCE0 · divider #E8EAED
//   success #188038 · warning #F9AB00 · critical #D93025
// No gray/slate/zinc/neutral tones, no invented hues. Every chart, badge,
// icon, and graph in the app draws exclusively from this object.
export const TOKENS = {
  primaryBlue: '#1a73e8',
  primaryDark: '#1557b0',
  secondaryBlue: '#1557b0', // alias kept for existing call sites — resolves to dark blue, NOT #4285F4
  lightBlue: '#e8f0fe',
  blueSurface: '#f3f7ff',
  textPrimary: '#202124',
  textSecondary: '#5f6368',
  textMuted: '#5f6368', // strict palette has no separate muted gray — falls back to secondary text
  border: '#dadce0',
  divider: '#e8eaed',
  bg: '#ffffff',
  bgSecondary: '#f3f7ff', // pale blue replaces the old #F8F9FA gray secondary surface
  success: '#188038',
  successSurface: '#ffffff', // semantic colors are never used as background tints
  warning: '#f9ab00',
  warningSurface: '#ffffff',
  critical: '#d93025',
  criticalSurface: '#ffffff',
  info: '#1a73e8',
  infoSurface: '#e8f0fe',
  sevHigh: '#d93025', // HIGH is visually grouped with CRITICAL (both red) — the strict palette has no 4th severity hue
};

export const riskColor = (score: number): string => {
  if (score >= 80) return TOKENS.critical;
  if (score >= 60) return TOKENS.critical;
  if (score >= 40) return TOKENS.warning;
  return TOKENS.success;
};

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export const severityClass = (s: string): string =>
  ({
    CRITICAL: 'sev-critical',
    HIGH: 'sev-high',
    MEDIUM: 'sev-medium',
    LOW: 'sev-low',
    INFO: 'sev-info',
  }[s] ?? 'sev-low');

export const severityColor = (s: string): string =>
  ({
    CRITICAL: TOKENS.critical,
    HIGH: TOKENS.sevHigh,
    MEDIUM: TOKENS.warning,
    LOW: TOKENS.success,
    INFO: TOKENS.info,
  }[s] ?? TOKENS.success);

export const trendIcon = (v: number) => (v > 0 ? '↑' : '↓');

export const formatPct = (v: number, digits = 0): string => `${v.toFixed(digits)}%`;

// Source colors are drawn exclusively from the strict CRISPR palette
// (primary blue / dark blue / warning / critical / secondary text) —
// no invented purple/orange hues.
export const sourceColor = (source: string): string =>
  ({
    BUG_BOUNTY: TOKENS.warning,
    VULNERABILITY_SCANNER: TOKENS.primaryBlue,
    XDR: TOKENS.secondaryBlue,
    IAM: TOKENS.critical,
    THREAT_INTEL: TOKENS.critical,
    SIEM: TOKENS.textSecondary,
    EDR: TOKENS.textSecondary,
    CSPM: TOKENS.textSecondary,
  }[source] ?? TOKENS.textSecondary);

export const sourceLabel = (source: string): string =>
  ({
    BUG_BOUNTY: 'Bug Bounty',
    VULNERABILITY_SCANNER: 'Vuln Scanner',
    XDR: 'XDR',
    IAM: 'IAM',
    THREAT_INTEL: 'Threat Intel',
    SIEM: 'SIEM',
    EDR: 'EDR',
    CSPM: 'CSPM',
  }[source] ?? source);

export const sourceAbbrev = (source: string): string =>
  ({
    BUG_BOUNTY: 'BB',
    VULNERABILITY_SCANNER: 'VS',
    XDR: 'XDR',
    IAM: 'IAM',
    THREAT_INTEL: 'TI',
    SIEM: 'SIEM',
    EDR: 'EDR',
    CSPM: 'CSPM',
  }[source] ?? source);
