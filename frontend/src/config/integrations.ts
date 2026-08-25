// ============================================================================
// Centralized integration → visual identity mapping.
// ----------------------------------------------------------------------------
// We deliberately do NOT download third-party raster logos (licensing +
// quality risk in an offline sandbox). Instead every integration gets a
// consistent SVG "brand chip": a fixed-size rounded square in the vendor's
// primary brand color with either a lucide glyph or the vendor's initials,
// rendered by <IntegrationLogo /> (src/components/common/IntegrationLogo.tsx).
// This keeps sizing and visual weight perfectly consistent across the whole
// app (source pills, integration cards, repository badges, top-bar chips).
// ============================================================================

import {
  Github,
  Gitlab,
  Cloud,
  MessageSquare,
  Ticket,
  Radar,
  Bug,
  ShieldHalf,
  UserCheck,
  ScanSearch,
  Package,
  type LucideIcon,
} from 'lucide-react';

export interface IntegrationVisual {
  label: string;
  color: string; // brand-ish accent used for the chip background
  icon: LucideIcon;
}

// Real third-party brand colors (GitHub/GitLab/AWS/Azure/Slack/Jira) are
// preserved as-is — these are the vendors' actual brand hexes, used only
// inside each vendor's own logo chip, per the strict palette's rule that
// "integration logos retain their actual brand colors ONLY inside their
// logo artwork." Category placeholders that are NOT a real third-party
// brand (GCP chip here is a generic cloud icon, SIEM/EDR/XDR/Bug
// Bounty/IAM/SAST/SCA) are recolored to draw exclusively from the strict
// CRISPR palette (primary blue / dark blue / warning / critical / success
// / secondary text) — no invented purple/orange/gray hues.
export const INTEGRATION_VISUALS: Record<string, IntegrationVisual> = {
  github: { label: 'GitHub', color: '#24292e', icon: Github },
  gitlab: { label: 'GitLab', color: '#e2492a', icon: Gitlab },
  aws: { label: 'AWS', color: '#ff9900', icon: Cloud },
  azure: { label: 'Azure', color: '#0078d4', icon: Cloud },
  gcp: { label: 'GCP', color: '#1a73e8', icon: Cloud },
  slack: { label: 'Slack', color: '#611f69', icon: MessageSquare },
  jira: { label: 'Jira', color: '#0052cc', icon: Ticket },
  siem: { label: 'SIEM', color: '#5f6368', icon: Radar },
  edr: { label: 'EDR', color: '#5f6368', icon: ShieldHalf },
  xdr: { label: 'XDR', color: '#1557b0', icon: Radar },
  bugbounty: { label: 'Bug Bounty', color: '#f9ab00', icon: Bug },
  iam: { label: 'IAM', color: '#d93025', icon: UserCheck },
  sast: { label: 'SAST', color: '#1a73e8', icon: ScanSearch },
  sca: { label: 'SCA', color: '#188038', icon: Package },
};

export function getIntegrationVisual(key: string): IntegrationVisual {
  return INTEGRATION_VISUALS[key] ?? { label: key, color: '#5f6368', icon: ShieldHalf };
}
