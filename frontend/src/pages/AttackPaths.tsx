import { useLanguage } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { DatabaseZap, Network, Waypoints } from 'lucide-react';
import AttackPathGraph from '../components/attackpath/AttackPathGraph';
import NodeDetailPanel from '../components/attackpath/NodeDetailPanel';
import SeverityBadge from '../components/common/SeverityBadge';
import { activateOnEnter } from '../utils/a11y';
import type { AttackPath, AttackPathNode, Severity } from '../types';
import { getWorkspace, SIH_WORKSPACE_ENABLED } from '../lib/workspace';
import { getAttackPaths } from '../lib/api';
import { toast } from '../lib/toastStore';

export default function AttackPaths() {
  const { t } = useLanguage();
  const [paths, setPaths] = useState<AttackPath[]>([]);
  const [activePathId, setActivePathId] = useState('');
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activePath = paths.find((p) => p.id === activePathId) ?? paths[0];
  const executiveView = SIH_WORKSPACE_ENABLED && getWorkspace() === 'executive';

  useEffect(() => {
    getAttackPaths().then((rows: any[]) => {
      const normalized: AttackPath[] = rows.map((row, index) => {
        const severity: Severity = Number(row.risk_score ?? 0) >= 80 ? 'CRITICAL' : Number(row.risk_score ?? 0) >= 60 ? 'HIGH' : 'MEDIUM';
        if (Array.isArray(row.nodes) && row.nodes.every((node: any) => node && typeof node === 'object' && node.id)) {
          return row as AttackPath;
        }
        if (Array.isArray(row.nodes) && row.nodes.length > 0) {
          const nodeNames = row.nodes.map((node: any) => String(node));
          const nodes: AttackPathNode[] = nodeNames.map((name: string, nodeIndex: number) => ({
            id: name,
            label: name,
            type: nodeIndex === 0 ? 'internet' : nodeIndex === nodeNames.length - 1 ? 'database' : 'compute',
            severity: nodeIndex === 0 ? undefined : severity,
            x: 70 + nodeIndex * 190,
            y: 120 + (nodeIndex % 2) * 70,
          }));
          const edges = Array.isArray(row.edges) ? row.edges.map((edge: any, edgeIndex: number) => ({
            id: String(edge.external_edge_id ?? edge.id ?? `${row.id}-edge-${edgeIndex}`),
            source: String(edge.source_node ?? edge.source ?? nodeNames[edgeIndex]),
            target: String(edge.target_node ?? edge.target ?? nodeNames[edgeIndex + 1]),
            label: String(edge.relation_type ?? edge.label ?? 'Reachable').replace(/_/g, ' '),
            risky: true,
          })) : [];
          return {
            id: String(row.id ?? `path-${index + 1}`),
            title: `${row.start ?? nodeNames[0]} → ${row.target ?? nodeNames[nodeNames.length - 1]}`,
            severity,
            nodes,
            edges,
          };
        }
        const startId = `${row.id ?? index}-start`;
        const targetId = `${row.id ?? index}-target`;
        return {
          id: String(row.id ?? `path-${index + 1}`), title: `${row.start ?? 'Entry point'} → ${row.target ?? 'Target'}`, severity,
          nodes: [
            { id: startId, label: row.start ?? 'Entry point', type: 'internet', x: 70, y: 100 },
            { id: targetId, label: row.target ?? 'Target', type: 'database', severity, x: 300, y: 100 },
          ],
          edges: [{ id: `${row.id ?? index}-edge`, source: startId, target: targetId, label: 'Exploitable', risky: true }],
        };
      });
      setPaths(normalized);
      setActivePathId(normalized[0]?.id ?? '');
      setLoading(false);
    }).catch((requestError) => {
      const detail = requestError?.response?.data?.detail ?? 'The backend could not calculate attack paths.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setLoading(false);
      toast.error('Attack paths unavailable', 'The backend could not calculate attack paths.');
    });
  }, []);

  if (loading) return <div className="page-container"><div className="card empty-state">Loading attack-path evidence…</div></div>;
  if (!activePath) return <div className="page-container"><div className="card empty-state">{error || 'No attack paths are currently available.'}</div></div>;

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <div className="attack-path-heading">
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Waypoints size={22} color="var(--color-primary-blue)" /> {executiveView ? 'Attack Path Overview' : 'Attack Paths'}
            </h1>
            <p>Trace evidence-backed routes from external entry points to critical assets.</p>
          </div>
          <div className="attack-path-engine"><DatabaseZap size={16} /><span><strong>Neo4j</strong> graph traversal</span></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {paths.map((p) => (
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

      <div className="attack-path-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
        <div className="card">
          <div className="attack-graph-title">
            <div><Network size={16} /><span>{activePath.title}</span></div>
            <span>{activePath.nodes.length} nodes · {activePath.edges.length} relationships</span>
          </div>
          <AttackPathGraph path={activePath} height={540} selectedNodeId={selectedNode?.id} onSelectNode={setSelectedNode} />
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
              <th>{t("Type")}</th>
              <th>{t("Severity")}</th>
              <th>{t("Owner")}</th>
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
