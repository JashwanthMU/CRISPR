import { useLanguage } from '../lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, Network, ShieldAlert, Waypoints } from 'lucide-react';
import AttackPathGraph from '../components/attackpath/AttackPathGraph';
import NodeDetailPanel from '../components/attackpath/NodeDetailPanel';
import SeverityBadge from '../components/common/SeverityBadge';
import { activateOnEnter } from '../utils/a11y';
import type { AttackPath, AttackPathNode, Severity } from '../types';
import { getEffectiveWorkspace, SIH_WORKSPACE_ENABLED } from '../lib/workspace';
import { getAttackPaths } from '../lib/api';
import { toast } from '../lib/toastStore';
import { formatRupees } from '../utils/format';

function mergeAttackTopology(paths: AttackPath[]): AttackPath | null {
  if (!paths.length) return null;
  const nodeMap = new Map<string, AttackPathNode>();
  const edgeMap = new Map<string, AttackPath['edges'][number]>();
  paths.forEach((path) => {
    path.nodes.forEach((node) => {
      const current = nodeMap.get(node.id);
      nodeMap.set(node.id, current?.severity === 'CRITICAL' ? current : { ...current, ...node });
    });
    path.edges.forEach((edge) => edgeMap.set(`${edge.source}:${edge.target}:${edge.label ?? ''}`, edge));
  });

  const edges = [...edgeMap.values()];
  const incoming = new Map<string, number>();
  nodeMap.forEach((_, id) => incoming.set(id, 0));
  edges.forEach((edge) => incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1));
  const roots = [...nodeMap.keys()].filter((id) => (incoming.get(id) ?? 0) === 0);
  const depth = new Map<string, number>(roots.map((id) => [id, 0]));
  const queue = [...roots];
  const processed = new Set<string>();
  while (queue.length) {
    const source = queue.shift()!;
    if (processed.has(source)) continue;
    processed.add(source);
    edges.filter((edge) => edge.source === source).forEach((edge) => {
      const nextDepth = (depth.get(source) ?? 0) + 1;
      if (nextDepth > (depth.get(edge.target) ?? -1)) depth.set(edge.target, nextDepth);
      if (!processed.has(edge.target) && !queue.includes(edge.target)) queue.push(edge.target);
    });
  }
  const levels = new Map<number, string[]>();
  nodeMap.forEach((_, id) => {
    const level = depth.get(id) ?? 0;
    levels.set(level, [...(levels.get(level) ?? []), id]);
  });
  const nodes = [...nodeMap.values()].map((node) => {
    const level = depth.get(node.id) ?? 0;
    const peers = levels.get(level) ?? [node.id];
    const index = peers.indexOf(node.id);
    return { ...node, x: 75 + level * 180, y: 100 + index * 130 };
  });
  return { id: 'enterprise-topology', title: 'Enterprise attack topology', severity: paths.some((path) => path.severity === 'CRITICAL') ? 'CRITICAL' : paths[0].severity, nodes, edges };
}

export default function AttackPaths() {
  const { t } = useLanguage();
  const [paths, setPaths] = useState<AttackPath[]>([]);
  const [activePathId, setActivePathId] = useState('');
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activePath = paths.find((p) => p.id === activePathId) ?? paths[0];
  const executiveView = SIH_WORKSPACE_ENABLED && getEffectiveWorkspace() === 'executive';
  const criticalPaths = paths.filter((path) => path.severity === 'CRITICAL').length;
  const maximumImpact = Math.max(0, ...paths.map((path) => Number(path.financial_impact_inr ?? 0)));
  const maximumConfidence = Math.max(0, ...paths.map((path) => Number(path.confidence ?? 0)));
  const technicalTopology = useMemo(() => mergeAttackTopology(paths), [paths]);
  const executivePaths = useMemo(
    () => [...paths].sort((a, b) => Number(b.financial_impact_inr ?? 0) - Number(a.financial_impact_inr ?? 0)).slice(0, 5),
    [paths],
  );
  const executiveTopology = useMemo(() => mergeAttackTopology(executivePaths), [executivePaths]);

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
        </div>
      </div>

      {!executiveView && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
      </div>}

      {executiveView ? (
        <>
          <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldAlert size={20} color="var(--sev-critical)" />
              <div><div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Critical business routes</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{criticalPaths}</div></div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IndianRupee size={20} color="var(--color-primary-blue)" />
              <div><div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Highest potential impact</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatRupees(maximumImpact)}</div></div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Network size={20} color="var(--color-primary-blue)" />
              <div><div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Evidence confidence</div><div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Math.round(maximumConfidence * 100)}%</div></div>
            </div>
          </div>

          <div className="card">
            <div className="attack-graph-title">
              <div><Network size={16} /><span>Enterprise exposure topology</span></div>
              <span>{executiveTopology?.nodes.length ?? 0} priority stages · {executivePaths.length} highest-impact routes</span>
            </div>
            {executiveTopology && <AttackPathGraph path={executiveTopology} height={390} />}
            <div style={{ marginTop: 12, fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              The overview combines all evidence-backed routes from external entry points to sensitive business assets. Red transitions identify where prioritized controls can interrupt exposure.
            </div>
          </div>

          <div className="card">
            <div className="card-title">Business Exposure Routes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
              {executivePaths.map((path) => (
                <div key={path.id} style={{ border: '1px solid var(--bg-border)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <SeverityBadge severity={path.severity} />
                    <strong style={{ color: 'var(--text-primary)' }}>{formatRupees(path.financial_impact_inr ?? 0)}</strong>
                  </div>
                  <div style={{ marginTop: 14, fontWeight: 700 }}>{path.title}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {path.nodes.map((node, index) => (
                      <span key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {index > 0 && <span aria-hidden="true">→</span>}
                        <span className="chip">{node.label}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {path.nodes.length} business stages · {Math.round(Number(path.confidence ?? 0) * 100)}% evidence confidence
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--bg-border)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Decision: prioritize controls that interrupt the highest-impact route earliest, then verify the realized financial risk reduction through remediation evidence.
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="attack-path-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
            <div className="card">
              <div className="attack-graph-title">
                <div><Network size={16} /><span>Enterprise topology · Focus: {activePath.title}</span></div>
                <span>{technicalTopology?.nodes.length ?? 0} nodes · {technicalTopology?.edges.length ?? 0} relationships</span>
              </div>
              {technicalTopology && <AttackPathGraph path={technicalTopology} height={640} selectedNodeId={selectedNode?.id} onSelectNode={setSelectedNode} />}
              <div style={{ marginTop: 10, fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
                Drag to pan · use controls to zoom · click a node to inspect · red edges indicate an exploitable transition
              </div>
            </div>
            <div className="card">
              <div className="card-title">Node Details</div>
              <NodeDetailPanel node={selectedNode} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Technical Path Evidence</div>
            <table className="data-table">
              <thead><tr><th>Node</th><th>{t("Type")}</th><th>{t("Severity")}</th><th>{t("Owner")}</th><th>Environment</th></tr></thead>
              <tbody>
                {(technicalTopology?.nodes ?? []).map((n) => (
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
        </>
      )}
    </div>
  );
}
