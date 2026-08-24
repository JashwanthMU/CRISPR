import type { AttackPathNode } from '../../types';
import { ATTACK_NODE_ICON } from '../../config/icons';
import SeverityBadge from '../common/SeverityBadge';

interface Props {
  node: AttackPathNode | null;
}

export default function NodeDetailPanel({ node }: Props) {
  if (!node) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        Select a node on the graph to inspect its details.
      </div>
    );
  }
  const Icon = ATTACK_NODE_ICON[node.type];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color="var(--accent-cyan)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{node.label}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{node.type.replace(/_/g, ' ')}</div>
        </div>
      </div>
      {node.description && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{node.description}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.75rem' }}>
        {node.severity && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Severity</div>
            <SeverityBadge severity={node.severity} />
          </div>
        )}
        {node.owner && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Owner</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{node.owner}</div>
          </div>
        )}
        {node.environment && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Environment</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{node.environment}</div>
          </div>
        )}
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Asset Type</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{node.type.replace(/_/g, ' ')}</div>
        </div>
      </div>
    </div>
  );
}
