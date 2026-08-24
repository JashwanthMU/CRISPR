import axios from 'axios';

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE, timeout: 8000 });

// Never throw on network/HTTP errors — resolve with data: null so callers can fall back to mock data.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.warn('API error', err?.message);
    return Promise.resolve({ data: null });
  }
);

export const getRisks = () => api.get('/api/risks');
export const getEnterprise = () => api.get('/api/risks/enterprise');
export const getAssets = () => api.get('/api/assets');
export const getAsset = (id: string) => api.get(`/api/assets/${id}`);
export const getFindings = () => api.get('/api/findings');
export const getSources = () => api.get('/api/findings/sources');
export const getScenarios = (p: object) => api.get('/api/scenarios', { params: p });
export const getPresets = () => api.get('/api/scenarios/presets');
export const optimize = (budget_inr: number) => api.post('/api/optimize', { budget_inr });
export const getCompliance = () => api.get('/api/compliance');
export const getGaps = () => api.get('/api/compliance/gaps');
export const queryAssistant = (question: string) => api.post('/api/assistant/query', { question });
export const getForecast = () => api.get('/api/assistant/forecast');

export default api;
