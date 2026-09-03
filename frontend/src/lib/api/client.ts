import axios from 'axios';
import { clearSession, getAccessToken } from '../auth';

// Shared axios instance for the whole app. Kept separate from
// src/services/api.ts (legacy endpoints already wired into existing pages)
// so we don't risk breaking working call-sites; new code should prefer
// src/lib/api/index.ts.
// Use same-origin API requests in Docker/AWS; frontend Nginx proxies /api.
const BASE = (import.meta as any).env?.VITE_API_URL || '';

export const httpClient = axios.create({ baseURL: BASE, timeout: 8000 });

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) clearSession();
    console.warn('[api] request failed', err?.message);
    return Promise.reject(err);
  }
);

/** Live backend never substitutes fixtures; demo is an explicit offline mode. */
export const API_MODE: 'demo' | 'live' = ((import.meta as any).env?.VITE_API_MODE === 'demo' ? 'demo' : 'live');

/** Simulated network latency so demo-mode UI still exercises loading states. */
export function simulateLatency<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
