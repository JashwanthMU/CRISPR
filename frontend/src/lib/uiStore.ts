import { createStore } from './store';
import type { DashboardFilters } from '../types';

// ----------------------------------------------------------------------------
// Global UI state: sidebar collapse, command palette visibility, active drawer,
// and the shared dashboard filter bar (time range / environment / severity /
// source / owner) used across Security Dashboard, Findings, Risk Cases, etc.
// ----------------------------------------------------------------------------

export type DrawerKind = 'risk-case' | 'finding' | 'repository' | 'attack-path' | null;

interface DrawerState {
  kind: DrawerKind;
  id: string | null;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  drawer: DrawerState;
  filters: DashboardFilters;
}

export const useUiStore = createStore<UiState>({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandPaletteOpen: false,
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
  useUiStore.setState((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
}

export function openCommandPalette() {
  useUiStore.setState({ commandPaletteOpen: true });
}

export function closeCommandPalette() {
  useUiStore.setState({ commandPaletteOpen: false });
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
