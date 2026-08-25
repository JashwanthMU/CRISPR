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

const unwrap = (request: Promise<any>, key?: string) =>
  request.then((response) => ({
    ...response,
    data: response?.data == null ? null : key ? response.data[key] ?? null : response.data,
  }));

export const getRisks = () => unwrap(api.get('/api/risks'), 'risks');
export const getEnterprise = () => api.get('/api/risks/enterprise');
export const getAssets = () => unwrap(api.get('/api/assets'), 'assets');
export const getAsset = (id: string) => api.get(`/api/assets/${id}`);
export const getFindings = () => unwrap(api.get('/api/findings'), 'findings');
export const getSources = () => api.get('/api/findings/sources');
export const getScenarios = (p: object) => api.get('/api/scenarios', { params: p });
export const getPresets = () => unwrap(api.get('/api/scenarios/presets'), 'presets');
export const optimize = (budget_inr: number) => api.post('/api/optimize', { budget_inr });
export const getControls = () => unwrap(api.get('/api/optimize/controls'), 'controls');
export const getCompliance = () => unwrap(api.get('/api/compliance'), 'frameworks');
export const getGaps = () => unwrap(api.get('/api/compliance/gaps'), 'gaps');
export const queryAssistant = (question: string) =>
  api.post('/api/assistant/query', { question }, { timeout: 90000 });
export const getForecast = () => unwrap(api.get('/api/assistant/forecast'), 'trend');
export const getAnomalies = () => api.get('/api/assistant/anomalies', { params: { include_llm_summary: false } });
export const getCorrelations = () => unwrap(api.get('/api/findings/correlate'), 'correlations');
export const getAssetRiskCases = (id: string) => unwrap(api.get(`/api/assets/${id}/risk-cases`), 'risk_cases');

export default api;
