import { createStore } from './store';
import type { Toast, ToastKind } from '../types';

interface ToastState {
  toasts: Toast[];
}

export const useToastStore = createStore<ToastState>({ toasts: [] });

let counter = 0;

export function pushToast(kind: ToastKind, title: string, description?: string, ttlMs = 4500) {
  const id = `toast_${Date.now()}_${counter++}`;
  const toast: Toast = { id, kind, title, description, ttlMs };
  useToastStore.setState((s) => ({ toasts: [...s.toasts, toast] }));
  if (ttlMs > 0) {
    setTimeout(() => dismissToast(id), ttlMs);
  }
  return id;
}

export function dismissToast(id: string) {
  useToastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

export const toast = {
  success: (title: string, description?: string) => pushToast('success', title, description),
  error: (title: string, description?: string) => pushToast('error', title, description),
  info: (title: string, description?: string) => pushToast('info', title, description),
  warning: (title: string, description?: string) => pushToast('warning', title, description),
};
