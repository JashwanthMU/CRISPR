// ============================================================================
// Demo engine — deterministic orchestrator for "Run Analysis".
// ----------------------------------------------------------------------------
// This is the ONE SOURCE OF TRUTH for the guided demo. It owns:
//   - pipeline stage state (Sources → ... → Remediation)
//   - the terminal transcript
//   - the timeline feed
//   - whether analysis is currently running
//
// It does not know about React. Any component (dashboard, pipeline widget,
// terminal, VS Code demo) subscribes via useDemoStore and reacts to the same
// underlying state, and/or subscribes directly to demoBus for fine-grained
// event handling (e.g. highlighting a specific file in the VS Code demo).
// ============================================================================

import { createStore } from '../lib/store';
import { demoBus } from './eventBus';
import { INITIAL_PIPELINE, INITIAL_TIMELINE } from './fixtures';
import { stageFile } from './vscodeFixtures';
import type { PipelineStage, TimelineEvent } from '../types';
import { toast } from '../lib/toastStore';

export interface TerminalLine {
  id: string;
  text: string;
  kind: 'command' | 'info' | 'ok' | 'warn' | 'error' | 'result';
}

interface DemoState {
  isRunning: boolean;
  progressPct: number;
  pipeline: PipelineStage[];
  timeline: TimelineEvent[];
  terminalLines: TerminalLine[];
  riskScore: number;
  previousRiskScore: number;
  activeFile: string | null;
  runCount: number;
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now()}_${idCounter++}`;

export const useDemoStore = createStore<DemoState>({
  isRunning: false,
  progressPct: 0,
  pipeline: INITIAL_PIPELINE.map((s) => ({ ...s })),
  timeline: [...INITIAL_TIMELINE],
  terminalLines: [
    { id: nextId('term'), text: '$ crispr scan ./repository', kind: 'command' },
    { id: nextId('term'), text: 'Idle. Click "Run Analysis" to start a live scan.', kind: 'info' },
  ],
  riskScore: 78,
  previousRiskScore: 75,
  activeFile: null,
  runCount: 0,
});

function pushTimeline(label: string, kind: TimelineEvent['kind'] = 'info', detail?: string) {
  const event: TimelineEvent = { id: nextId('tl'), timestamp: new Date().toISOString(), label, kind, detail };
  useDemoStore.setState((s) => ({ timeline: [event, ...s.timeline].slice(0, 40) }));
}

function pushTerminal(text: string, kind: TerminalLine['kind'] = 'info') {
  const line: TerminalLine = { id: nextId('term'), text, kind };
  useDemoStore.setState((s) => ({ terminalLines: [...s.terminalLines, line].slice(-80) }));
}

function setStage(id: string, patch: Partial<PipelineStage>) {
  useDemoStore.setState((s) => ({
    pipeline: s.pipeline.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
  }));
  // Keep the VS Code demo's active file in sync with whichever pipeline
  // stage is currently processing, so opening /demo/vscode during a run
  // shows the file that corresponds to the live stage.
  if (patch.state === 'processing') {
    const file = stageFile(id);
    if (file) useDemoStore.setState({ activeFile: file.path });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deterministic run — every step is scripted so the demo behaves identically
 * every time (no randomness), matching the spec's event list exactly:
 * REPOSITORY_CONNECTED, INGESTION_STARTED/COMPLETED, CORRELATION_STARTED/COMPLETED,
 * RISK_ENGINE_STARTED/COMPLETED, AI_ANALYSIS_STARTED/COMPLETED, FINDING_CREATED,
 * RISK_CASE_CREATED, REPORT_GENERATED.
 */
export async function runAnalysis() {
  if (useDemoStore.getState().isRunning) return;

  useDemoStore.setState((s) => ({
    isRunning: true,
    progressPct: 0,
    runCount: s.runCount + 1,
    terminalLines: [{ id: nextId('term'), text: '$ crispr scan ./repository --full', kind: 'command' }],
  }));
  demoBus.emit('ANALYSIS_RESET');
  toast.info('Analysis started', 'Running full ingestion, correlation, and risk scoring pipeline.');

  // Reset all stages to idle first so re-runs animate from a clean baseline.
  useDemoStore.setState((s) => ({ pipeline: s.pipeline.map((p) => ({ ...p, state: 'idle' as const })) }));

  // --- Step 1: Repository connected -----------------------------------
  await delay(350);
  setStage('sources', { state: 'processing' });
  pushTerminal('[INFO] Repository discovered: codesmiths/payments-service', 'info');
  pushTimeline('Repository connected', 'info', 'codesmiths/payments-service');
  demoBus.emit('REPOSITORY_CONNECTED', { repository: 'codesmiths/payments-service' });
  useDemoStore.setState({ progressPct: 8 });

  await delay(500);
  pushTerminal('[INFO] 142 assets discovered across 5 repositories', 'info');
  pushTimeline('142 assets discovered', 'info');
  setStage('sources', { state: 'completed', itemCount: 142, lastExecution: new Date().toISOString() });
  useDemoStore.setState({ progressPct: 15 });

  // --- Step 2: Ingestion ------------------------------------------------
  await delay(400);
  setStage('ingestion', { state: 'processing' });
  pushTerminal('[INFO] Ingestion started', 'info');
  pushTimeline('Ingestion started', 'info');
  demoBus.emit('INGESTION_STARTED');
  useDemoStore.setState({ progressPct: 24 });

  await delay(900);
  pushTerminal('[OK] Ingestion completed — 458 raw events normalized', 'ok');
  pushTimeline('Ingestion completed', 'success', '458 raw events normalized');
  setStage('ingestion', { state: 'completed', itemCount: 458, lastExecution: new Date().toISOString(), durationMs: 900 });
  setStage('normalization', { state: 'completed', itemCount: 458, lastExecution: new Date().toISOString(), durationMs: 400 });
  demoBus.emit('INGESTION_COMPLETED', { count: 458 });
  useDemoStore.setState({ progressPct: 38 });

  // --- Step 3: Correlation ----------------------------------------------
  await delay(400);
  setStage('correlation', { state: 'processing' });
  pushTerminal('[INFO] Correlation started', 'info');
  pushTimeline('Correlation started', 'info');
  demoBus.emit('CORRELATION_STARTED');
  useDemoStore.setState({ progressPct: 48 });

  await delay(900);
  pushTerminal('[OK] Correlation completed — 18 relationships identified', 'ok');
  pushTimeline('18 relationships identified', 'success');
  setStage('correlation', { state: 'completed', itemCount: 18, lastExecution: new Date().toISOString(), durationMs: 900 });
  demoBus.emit('CORRELATION_COMPLETED', { relationships: 18 });
  useDemoStore.setState({ progressPct: 60 });

  // --- Step 4: Risk engine ------------------------------------------------
  await delay(400);
  setStage('risk-engine', { state: 'processing' });
  pushTerminal('[INFO] Risk analysis started', 'info');
  pushTimeline('Risk engine started', 'info');
  demoBus.emit('RISK_ENGINE_STARTED');
  useDemoStore.setState({ progressPct: 70 });

  await delay(800);
  pushTerminal('[OK] 12 risks generated', 'ok');
  pushTimeline('12 risks generated', 'success');
  setStage('risk-engine', { state: 'completed', itemCount: 12, lastExecution: new Date().toISOString(), durationMs: 800 });
  demoBus.emit('RISK_CASE_CREATED', { count: 12 });
  demoBus.emit('FINDING_CREATED', { count: 12 });
  useDemoStore.setState({ progressPct: 80 });

  // --- Step 5: AI analysis ------------------------------------------------
  await delay(400);
  setStage('ai-analysis', { state: 'processing' });
  pushTerminal('[INFO] AI analysis started — prioritizing by business impact', 'info');
  demoBus.emit('AI_ANALYSIS_STARTED');
  useDemoStore.setState({ progressPct: 88 });

  await delay(900);
  const nextScore = useDemoStore.getState().riskScore === 78 ? 81 : 78;
  pushTerminal(`[OK] Risk score generated`, 'ok');
  pushTerminal('', 'result');
  pushTerminal(`Risk Score: ${nextScore}`, 'result');
  pushTimeline('AI analysis completed', 'success');
  setStage('ai-analysis', { state: 'completed', itemCount: 12, lastExecution: new Date().toISOString(), durationMs: 900 });
  setStage('prioritization', { state: 'completed', itemCount: 12, lastExecution: new Date().toISOString(), durationMs: 300 });
  demoBus.emit('AI_ANALYSIS_COMPLETED');
  useDemoStore.setState((s) => ({ progressPct: 96, previousRiskScore: s.riskScore, riskScore: nextScore }));

  // --- Step 6: Report -----------------------------------------------------
  await delay(400);
  pushTerminal('[OK] Report generated: crispr-risk-report-2026-08-24.pdf', 'ok');
  pushTimeline('Report generated', 'success', 'crispr-risk-report-2026-08-24.pdf');
  setStage('remediation', { state: 'completed', itemCount: 5, lastExecution: new Date().toISOString(), durationMs: 200 });
  demoBus.emit('REPORT_GENERATED');
  useDemoStore.setState({ progressPct: 100, isRunning: false });

  toast.success('Analysis complete', 'Risk score, findings, and risk cases have been updated.');
}

export function resetDemo() {
  useDemoStore.setState({
    isRunning: false,
    progressPct: 0,
    pipeline: INITIAL_PIPELINE.map((s) => ({ ...s })),
    activeFile: null,
  });
}
