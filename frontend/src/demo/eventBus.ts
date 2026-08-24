// ============================================================================
// Demo Event Bus — the single source of truth for the deterministic demo.
// ----------------------------------------------------------------------------
// Every part of the UI that needs to react to "Run Analysis" (dashboard KPIs,
// the pipeline visualization, the terminal, the VS Code demo, charts, toast
// notifications) subscribes to this bus. Nothing reaches into another
// component's state directly — everything reacts to the same event stream.
// ============================================================================

export type DemoEventType =
  | 'REPOSITORY_CONNECTED'
  | 'INGESTION_STARTED'
  | 'INGESTION_COMPLETED'
  | 'CORRELATION_STARTED'
  | 'CORRELATION_COMPLETED'
  | 'RISK_ENGINE_STARTED'
  | 'RISK_ENGINE_COMPLETED'
  | 'AI_ANALYSIS_STARTED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'FINDING_CREATED'
  | 'RISK_CASE_CREATED'
  | 'REPORT_GENERATED'
  | 'ANALYSIS_RESET';

export interface DemoEvent<T = any> {
  type: DemoEventType;
  payload?: T;
  timestamp: number;
}

type Handler = (event: DemoEvent) => void;

class DemoEventBus {
  private handlers = new Map<DemoEventType | '*', Set<Handler>>();
  private log: DemoEvent[] = [];

  on(type: DemoEventType | '*', handler: Handler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit<T>(type: DemoEventType, payload?: T) {
    const event: DemoEvent<T> = { type, payload, timestamp: Date.now() };
    this.log.push(event);
    this.handlers.get(type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }

  getLog() {
    return this.log;
  }

  clearLog() {
    this.log = [];
  }
}

export const demoBus = new DemoEventBus();
