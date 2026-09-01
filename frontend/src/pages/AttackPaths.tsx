import { useState } from 'react';
import { Waypoints } from 'lucide-react';
import { ATTACK_PATHS } from '../demo/fixtures';
import AttackPathGraph from '../components/attackpath/AttackPathGraph';
import NodeDetailPanel from '../components/attackpath/NodeDetailPanel';
import SeverityBadge from '../components/common/SeverityBadge';
import { activateOnEnter } from '../utils/a11y';
import type { AttackPathNode } from '../types';

export default function AttackPaths() {
  const [activePathId, setActivePathId] = useState(ATTACK_PATHS[0].id);
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);

  const activePath = ATTACK_PATHS.find((p) => p.id === activePathId) ?? ATTACK_PATHS[0];

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Waypoints size={22} color="var(--color-primary-blue)" /> Attack Paths
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Trace exploitable routes from the internet to your most sensitive resources
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ATTACK_PATHS.map((p) => (
          <button
            key={p.id}
            className="chip"
            onClick={() => {
              setActivePathId(p.id);
              setSelectedNode(null);
            }}
            style={{
              borderColor: activePathId === p.id ? 'var(--accent-blue)' : 'var(--bg-border)',
              color: activePathId === p.id ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <SeverityBadge severity={p.severity} />
            {p.title}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="card">
          <div className="card-title">{activePath.title}</div>
          <AttackPathGraph path={activePath} height={380} selectedNodeId={selectedNode?.id} onSelectNode={setSelectedNode} />
          <div style={{ marginTop: 10, fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
            Drag to pan · scroll buttons to zoom · click a node to inspect · red edges indicate an exploitable transition
          </div>
        </div>
        <div className="card">
          <div className="card-title">Node Details</div>
          <NodeDetailPanel node={selectedNode} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Path Summary</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Owner</th>
              <th>Environment</th>
            </tr>
          </thead>
          <tbody>
            {activePath.nodes.map((n) => (
              <tr key={n.id} tabIndex={0} onClick={() => setSelectedNode(n)} onKeyDown={activateOnEnter(() => setSelectedNode(n))}>
                <td style={{ fontWeight: 600 }}>{n.label}</td>
                <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{n.type.replace(/_/g, ' ')}</td>
                <td>{n.severity ? <SeverityBadge severity={n.severity} /> : <span style={{ color: 'var(--text-subtle)' }}>—</span>}</td>
                <td>{n.owner ?? '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{n.environment ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
