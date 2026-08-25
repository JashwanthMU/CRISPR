import axios from 'axios';

// Shared axios instance for the whole app. Kept separate from
// src/services/api.ts (legacy endpoints already wired into existing pages)
// so we don't risk breaking working call-sites; new code should prefer
// src/lib/api/index.ts.
const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const httpClient = axios.create({ baseURL: BASE, timeout: 8000 });

httpClient.interceptors.response.use(
  (r) => r,
  (err) => {
    console.warn('[api] request failed', err?.message);
    return Promise.resolve({ data: null });
  }
);

/** Live backend by default; set VITE_API_MODE=demo only for an offline presentation. */
export const API_MODE: 'demo' | 'live' = ((import.meta as any).env?.VITE_API_MODE === 'demo' ? 'demo' : 'live');

/** Simulated network latency so demo-mode UI still exercises loading states. */
export function simulateLatency<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
