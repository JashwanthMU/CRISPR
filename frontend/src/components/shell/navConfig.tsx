import {
  ShieldCheck,
  IndianRupee,
  Search,
  Building2,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  Waypoints,
  Boxes,
  Bug,
  KeyRound,
  Radar,
  Cloud,
  UserCog,
  Code2,
  ListChecks,
  Inbox,
  FileText,
  ScrollText,
  Plug,
  Terminal as TerminalIcon,
  Settings,
  FileCode2,
  type LucideIcon,
} from 'lucide-react';
import type { NavGroupId } from '../../lib/uiStore';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: NavGroupId;
  title: string;
  items: NavItem[];
}

/**
 * Single source of truth for the sidebar navigation tree. Centralized here
 * (rather than inline in Sidebar.tsx) so the command palette's "Pages"
 * category and any future breadcrumb/label lookups can share the same
 * data instead of maintaining a second hardcoded list.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      { label: 'Security Dashboard', to: '/security', icon: ShieldCheck },
      { label: 'Financial Dashboard', to: '/financial', icon: IndianRupee },
    ],
  },
  {
    id: 'investigate',
    title: 'Investigate',
    items: [
      { label: 'Findings', to: '/findings', icon: Search },
      { label: 'Assets', to: '/assets', icon: Building2 },
      { label: 'Risk Cases', to: '/risks', icon: AlertTriangle },
      { label: 'Attack Paths', to: '/attack-paths', icon: Waypoints },
      { label: 'Resources', to: '/resources', icon: Boxes },
    ],
  },
  {
    id: 'detect',
    title: 'Detect',
    items: [
      { label: 'Vulnerabilities', to: '/vulnerabilities', icon: Bug },
      { label: 'Secrets', to: '/secrets', icon: KeyRound },
      { label: 'Threat Intelligence', to: '/threat-intelligence', icon: Radar },
      { label: 'Cloud Security', to: '/cloud-security', icon: Cloud },
      { label: 'Identity Security', to: '/identity-security', icon: UserCog },
      { label: 'Code Security', to: '/code-security', icon: Code2 },
    ],
  },
  {
    id: 'remediate',
    title: 'Remediate',
    items: [
      { label: 'Scenarios', to: '/scenarios', icon: RefreshCw },
      { label: 'Recommendations', to: '/recommendations', icon: ListChecks },
      { label: 'Remediation Queue', to: '/remediation-queue', icon: Inbox },
      { label: 'Investment Optimizer', to: '/investments', icon: Lightbulb },
    ],
  },
  {
    id: 'govern',
    title: 'Govern',
    items: [
      { label: 'Compliance', to: '/compliance', icon: CheckCircle2 },
      { label: 'Policies', to: '/policies', icon: FileText },
      { label: 'Reports', to: '/reports', icon: ScrollText },
    ],
  },
  {
    id: 'platform',
    title: 'Platform',
    items: [
      { label: 'Integrations', to: '/integrations', icon: Plug },
      { label: 'API', to: '/api-reference', icon: TerminalIcon },
      { label: 'Dev Workspace', to: '/demo/vscode', icon: FileCode2 },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

/** Flat lookup used by TopHeader's breadcrumb builder. */
export const PAGE_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.to.replace(/^\//, ''), i.label]))
);
