// ============================================================================
// Tiny vanilla store (zustand-style) with zero external dependencies.
// ----------------------------------------------------------------------------
// We don't have registry access to add zustand/redux in this environment, so
// this implements the same well-known pattern by hand: a store that holds
// state outside of React, notifies subscribers on change, and exposes a hook
// built on React's built-in `useSyncExternalStore` for tear-free reads.
//
// Usage:
//   const useUiStore = createStore({ sidebarCollapsed: false });
//   const collapsed = useUiStore((s) => s.sidebarCollapsed);
//   useUiStore.setState({ sidebarCollapsed: true });
//   useUiStore.getState();
// ============================================================================

import { useSyncExternalStore } from 'react';

type Listener = () => void;

export interface StoreApi<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: Listener) => () => void;
}

export type UseStoreHook<T> = (<U>(selector: (state: T) => U) => U) & StoreApi<T>;

export function createStore<T extends object>(initialState: T): UseStoreHook<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState: StoreApi<T>['setState'] = (partial) => {
    const nextPartial = typeof partial === 'function' ? (partial as (s: T) => Partial<T>)(state) : partial;
    state = { ...state, ...nextPartial };
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  function useStore<U>(selector: (s: T) => U): U {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state)
    );
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore as UseStoreHook<T>;
}
