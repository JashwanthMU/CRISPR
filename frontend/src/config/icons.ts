// ============================================================================
// Centralized icon registry.
// ----------------------------------------------------------------------------
// Every icon used for a "type" (severity, source, asset type, attack node
// type, nav section...) is resolved through this file so we never mix icon
// styles or scatter ad-hoc lucide imports with inconsistent sizing across
// the app. All icons come from lucide-react (already an installed
// dependency) — no raster logos, no emoji.
// ============================================================================

import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Bug,
  Database,
  Server,
  Globe,
  Container,
  GitBranch,
  Cpu,
  HardDrive,
  KeyRound,
  User,
  Boxes,
  Lock,
  FileWarning,
  type LucideIcon,
} from 'lucide-react';

export const SEVERITY_ICON: Record<string, LucideIcon> = {
  CRITICAL: AlertOctagon,
  HIGH: AlertTriangle,
  MEDIUM: ShieldAlert,
  LOW: ShieldCheck,
  INFO: Info,
};

export const ASSET_TYPE_ICON: Record<string, LucideIcon> = {
  api_gateway: Globe,
  database: Database,
  web_app: Server,
  server: Cpu,
  container: Container,
  repository: GitBranch,
  kubernetes: Boxes,
  bucket: HardDrive,
  identity: User,
  secret: KeyRound,
  application: Server,
};

export const ATTACK_NODE_ICON: Record<string, LucideIcon> = {
  internet: Globe,
  api: Server,
  identity: User,
  compute: Cpu,
  database: Database,
  storage: HardDrive,
  network: Boxes,
  user: User,
  data: FileWarning,
  vulnerability: Bug,
};

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  secrets: KeyRound,
  iac: Boxes,
  sca: Bug,
  malware: ShieldAlert,
  dspm: Database,
  posture: Lock,
};
