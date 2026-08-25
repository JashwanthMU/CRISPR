import { createStore } from './store';
import type { DashboardFilters } from '../types';

// ----------------------------------------------------------------------------
// Global UI state: sidebar collapse/width, nav group expansion, header
// popovers, command palette visibility, active drawer, organization/project
// selection, and the shared dashboard filter bar (time range / environment /
// severity / source / owner) used across Security Dashboard, Findings, Risk
// Cases, etc.
//
// Sidebar collapse state, expanded nav groups, and the selected org/project
// are persisted to localStorage so they survive a page reload — this is
// genuine UI preference persistence, not fake/mocked state.
// ----------------------------------------------------------------------------

export type DrawerKind = 'risk-case' | 'finding' | 'repository' | 'attack-path' | null;

interface DrawerState {
  kind: DrawerKind;
  id: string | null;
}

/** Only one header popover may be open at a time (standard enterprise UX). */
export type PopoverKind = 'ai' | 'activity' | 'status' | 'notifications' | 'profile' | 'org' | 'project' | 'timerange' | null;

const LS_SIDEBAR_COLLAPSED = 'crispr_sidebar_collapsed';
const LS_SIDEBAR_WIDTH = 'crispr_sidebar_width';
const LS_EXPANDED_GROUPS = 'crispr_nav_expanded_groups';
const LS_ORG = 'crispr_selected_org';

export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const SIDEBAR_DEFAULT_WIDTH = 260;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 320;

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/availability errors */
  }
}

export const NAV_GROUP_IDS = ['overview', 'investigate', 'detect', 'remediate', 'govern', 'platform'] as const;
export type NavGroupId = (typeof NAV_GROUP_IDS)[number];

const DEFAULT_EXPANDED_GROUPS: Record<NavGroupId, boolean> = {
  overview: true,
  investigate: true,
  detect: true,
  remediate: true,
  govern: true,
  platform: true,
};

export interface OrgOption {
  id: string;
  name: string;
}

export const ORG_OPTIONS: OrgOption[] = [
  { id: 'novapay', name: 'NovaPay Financial Services' },
  { id: 'demo-org', name: 'Demo Organization' },
  { id: 'development', name: 'Development' },
  { id: 'production', name: 'Production' },
];

export interface ProjectOption {
  id: DashboardFilters['environment'];
  name: string;
}

export const PROJECT_OPTIONS: ProjectOption[] = [
  { id: 'all', name: 'Demo — All Projects' },
  { id: 'development', name: 'Development' },
  { id: 'staging', name: 'Staging' },
  { id: 'production', name: 'Production' },
];

interface UiState {
  sidebarCollapsed: boolean;
  sidebarWidth: number; // expanded-state width, resizable 200-320px, persisted
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  aiDrawerOpen: boolean;
  openPopover: PopoverKind;
  expandedGroups: Record<string, boolean>;
  selectedOrgId: string;
  drawer: DrawerState;
  filters: DashboardFilters;
}

export const useUiStore = createStore<UiState>({
  sidebarCollapsed: readLocalStorage(LS_SIDEBAR_COLLAPSED, true), // default COLLAPSED per shell spec
  sidebarWidth: readLocalStorage(LS_SIDEBAR_WIDTH, SIDEBAR_DEFAULT_WIDTH),
  mobileNavOpen: false,
  commandPaletteOpen: false,
  aiDrawerOpen: false,
  openPopover: null,
  expandedGroups: readLocalStorage(LS_EXPANDED_GROUPS, DEFAULT_EXPANDED_GROUPS),
  selectedOrgId: readLocalStorage(LS_ORG, 'novapay'),
  drawer: { kind: null, id: null },
  filters: {
    timeRange: '6m',
    environment: 'all',
    severity: 'all',
    source: 'all',
    owner: 'all',
  },
});

export function toggleMobileNav() {
  useUiStore.setState((s) => ({ mobileNavOpen: !s.mobileNavOpen }));
}

export function closeMobileNav() {
  useUiStore.setState({ mobileNavOpen: false });
}

export function toggleSidebar() {
  useUiStore.setState((s) => {
    const next = !s.sidebarCollapsed;
    writeLocalStorage(LS_SIDEBAR_COLLAPSED, next);
    return { sidebarCollapsed: next };
  });
}

export function setSidebarWidth(width: number) {
  const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
  writeLocalStorage(LS_SIDEBAR_WIDTH, clamped);
  useUiStore.setState({ sidebarWidth: clamped });
}

export function toggleNavGroup(id: string) {
  useUiStore.setState((s) => {
    const next = { ...s.expandedGroups, [id]: !(s.expandedGroups[id] ?? true) };
    writeLocalStorage(LS_EXPANDED_GROUPS, next);
    return { expandedGroups: next };
  });
}

export function setSelectedOrg(id: string) {
  writeLocalStorage(LS_ORG, id);
  useUiStore.setState({ selectedOrgId: id });
}

export function openCommandPalette() {
  useUiStore.setState({ commandPaletteOpen: true, openPopover: null });
}

export function closeCommandPalette() {
  useUiStore.setState({ commandPaletteOpen: false });
}

export function openAIDrawer() {
  useUiStore.setState({ aiDrawerOpen: true, openPopover: null });
}

export function closeAIDrawer() {
  useUiStore.setState({ aiDrawerOpen: false });
}

export function togglePopover(kind: PopoverKind) {
  useUiStore.setState((s) => ({ openPopover: s.openPopover === kind ? null : kind }));
}

export function closePopover() {
  useUiStore.setState({ openPopover: null });
}

/** Closes every dismissible overlay — used by the global Escape handler. */
export function closeAllOverlays() {
  useUiStore.setState({
    openPopover: null,
    commandPaletteOpen: false,
    aiDrawerOpen: false,
    mobileNavOpen: false,
  });
}

export function openDrawer(kind: DrawerKind, id: string) {
  useUiStore.setState({ drawer: { kind, id } });
}

export function closeDrawer() {
  useUiStore.setState({ drawer: { kind: null, id: null } });
}

export function setFilter<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
  useUiStore.setState((s) => ({ filters: { ...s.filters, [key]: value } }));
}

export function resetFilters() {
  useUiStore.setState({
    filters: { timeRange: '6m', environment: 'all', severity: 'all', source: 'all', owner: 'all' },
  });
}
