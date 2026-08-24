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

export const riskColor = (score: number): string => {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  return '#22c55e';
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
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
    INFO: '#3b82f6',
  }[s] ?? '#22c55e');

export const trendIcon = (v: number) => (v > 0 ? '↑' : '↓');

export const formatPct = (v: number, digits = 0): string => `${v.toFixed(digits)}%`;

export const sourceColor = (source: string): string =>
  ({
    BUG_BOUNTY: '#7c3aed',
    VULNERABILITY_SCANNER: '#2563eb',
    XDR: '#06b6d4',
    IAM: '#f97316',
    THREAT_INTEL: '#ef4444',
    SIEM: '#8b949e',
    EDR: '#8b949e',
    CSPM: '#8b949e',
  }[source] ?? '#8b949e');

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
