// Compatibility facade for older pages. All traffic uses the one configured
// client, interceptor chain and live/demo boundary in lib/api.
import { API_MODE, httpClient as api } from '../lib/api/client';
import { MOCK_ASSETS, MOCK_CONTROLS, MOCK_ENTERPRISE, MOCK_FINDINGS, MOCK_OPTIMIZE_RESULT, MOCK_RISKS } from '../utils/mock';

const demoResponse = (data: any) => Promise.resolve({ data } as any);

const unwrap = (request: Promise<any>, key?: string) =>
  request.then((response) => ({
    ...response,
    data: response?.data == null ? null : key ? response.data[key] ?? null : response.data,
  }));

export const getRisks = () => API_MODE === 'demo' ? demoResponse(MOCK_RISKS) : unwrap(api.get('/api/risks'), 'risks');
export const getEnterprise = () => API_MODE === 'demo' ? demoResponse(MOCK_ENTERPRISE) : api.get('/api/risks/enterprise');
export const getAssets = () => API_MODE === 'demo' ? demoResponse(MOCK_ASSETS) : unwrap(api.get('/api/assets'), 'assets');
export const getAsset = (id: string) => api.get(`/api/assets/${id}`);
export const getFindings = () => API_MODE === 'demo' ? demoResponse(MOCK_FINDINGS) : unwrap(api.get('/api/findings'), 'findings');
export const getSources = () => api.get('/api/findings/sources');
const demoScenario = (p: any) => {
  const before = 18_400_000;
  let reduction = 0;
  if (p.implement_mfa) reduction += 4_860_000;
  if (p.implement_patching) reduction += 3_100_000;
  if (p.implement_segmentation) reduction += 3_870_000;
  if (p.edr_expand) reduction += 1_800_000;
  if (p.patch_delay) reduction -= p.patch_delay === 60 ? 3_900_000 : 2_100_000;
  return { before_total_eal_inr: before, after_total_eal_inr: Math.max(0, before - reduction), per_asset: MOCK_ASSETS.map((a: any, i: number) => ({ asset_name: a.name, before_eal_inr: Math.round(before / MOCK_ASSETS.length), after_eal_inr: Math.round(Math.max(0, before - reduction) / MOCK_ASSETS.length), asset_id: a.asset_id, rank: i + 1 })) };
};
const DEMO_PRESETS = [
  { id: 'mfa', name: 'Enable MFA', params: { implement_mfa: true }, cost_inr: 1_500_000, reduction_inr: 4_860_000, rosi_pct: 224 },
  { id: 'patch_now', name: 'Patch Now', params: { implement_patching: true }, cost_inr: 1_200_000, reduction_inr: 3_100_000, rosi_pct: 158 },
  { id: 'segment', name: 'Network Segmentation', params: { implement_segmentation: true }, cost_inr: 3_000_000, reduction_inr: 3_870_000, rosi_pct: 29 },
  { id: 'delay_30', name: 'Delay Patching 30 Days', params: { patch_delay: 30 }, cost_inr: 0, reduction_inr: -2_100_000, rosi_pct: null },
];
export const getScenarios = (p: object) => API_MODE === 'demo' ? demoResponse(demoScenario(p)) : api.get('/api/scenarios', { params: p });
export const getPresets = () => API_MODE === 'demo' ? demoResponse(DEMO_PRESETS) : unwrap(api.get('/api/scenarios/presets'), 'presets');
export const optimize = (budget_inr: number) => API_MODE === 'demo' ? demoResponse({ ...MOCK_OPTIMIZE_RESULT, budget_inr }) : api.post('/api/optimize', { budget_inr });
export const getControls = () => API_MODE === 'demo' ? demoResponse(MOCK_CONTROLS) : unwrap(api.get('/api/optimize/controls'), 'controls');
export const getCompliance = () => unwrap(api.get('/api/compliance'), 'frameworks');
export const getGaps = () => unwrap(api.get('/api/compliance/gaps'), 'gaps');
export const queryAssistant = (question: string) =>
  api.post('/api/assistant/query', { question }, { timeout: 90000 });
export const getForecast = () => unwrap(api.get('/api/assistant/forecast'), 'trend');
export const getAnomalies = () => api.get('/api/assistant/anomalies', { params: { include_llm_summary: false } });
export const getCorrelations = () => unwrap(api.get('/api/findings/correlate'), 'correlations');
export const getAssetRiskCases = (id: string) => unwrap(api.get(`/api/assets/${id}/risk-cases`), 'risk_cases');

export default api;
