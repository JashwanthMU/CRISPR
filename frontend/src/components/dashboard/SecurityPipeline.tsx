import { CheckCircle2, Loader2, AlertTriangle, XCircle, Circle } from 'lucide-react';
import { useDemoStore } from '../../demo/demoStore';
import type { PipelineStageState } from '../../types';

const STATE_ICON: Record<PipelineStageState, any> = {
  idle: Circle,
  processing: Loader2,
  completed: CheckCircle2,
  warning: AlertTriangle,
  failed: XCircle,
};

const STATE_COLOR: Record<PipelineStageState, string> = {
  idle: 'var(--text-subtle)',
  processing: 'var(--accent-cyan)',
  completed: 'var(--sev-low)',
  warning: 'var(--sev-medium)',
  failed: 'var(--sev-critical)',
};

/** Sources -> Ingestion -> Normalization -> Correlation -> Risk Engine -> AI Analysis -> Prioritization -> Remediation */
export default function SecurityPipeline() {
  const pipeline = useDemoStore((s) => s.pipeline);
  const isRunning = useDemoStore((s) => s.isRunning);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 4 }}>
        {pipeline.map((stage, i) => {
          const Icon = STATE_ICON[stage.state];
          const isLast = i === pipeline.length - 1;
          return (
            <div key={stage.id} className="pipeline-stage">
              <div className={`pipeline-node state-${stage.state}`}>
                <Icon size={18} color={STATE_COLOR[stage.state]} style={stage.state === 'processing' ? { animation: 'spin-refresh 0.9s linear infinite' } : undefined} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{stage.label}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{stage.itemCount} items</div>
              </div>
              {!isLast && <div className={`pipeline-connector${isRunning && stage.state === 'processing' ? ' active' : ''}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
