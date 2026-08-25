import { useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { AttackPath, AttackPathNode } from '../../types';
import { ATTACK_NODE_ICON } from '../../config/icons';
import { severityColor, TOKENS } from '../../utils/format';

interface Props {
  path: AttackPath;
  height?: number;
  selectedNodeId?: string | null;
  onSelectNode?: (node: AttackPathNode | null) => void;
}

const NODE_R = 26;

/**
 * Hand-built interactive attack-path graph (no charting/graph library
 * available offline). Supports hover highlight, click-to-select, pan
 * (drag), zoom in/out/reset. Designed so a future swap to a real graph
 * library (e.g. react-flow) only touches this file — callers just pass
 * nodes/edges/selection.
 */
export default function AttackPathGraph({ path, height = 320, selectedNodeId, onSelectNode }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const maxX = Math.max(...path.nodes.map((n) => n.x ?? 0)) + 80;
  const maxY = Math.max(...path.nodes.map((n) => n.y ?? 0)) + 80;

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const highlightedNodeIds = new Set<string>();
  if (hoveredId || selectedNodeId) {
    const activeId = hoveredId ?? selectedNodeId!;
    highlightedNodeIds.add(activeId);
    path.edges.forEach((e) => {
      if (e.source === activeId) highlightedNodeIds.add(e.target);
      if (e.target === activeId) highlightedNodeIds.add(e.source);
    });
  }

  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--color-bg-secondary)',
      }}
    >
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 5 }}>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.min(2.2, z + 0.2))} aria-label="Zoom in" title="Zoom in">
          <ZoomIn size={13} />
        </button>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} aria-label="Zoom out" title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <button className="icon-btn" onClick={resetView} aria-label="Reset view" title="Reset view">
          <Maximize2 size={13} />
        </button>
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${maxX} ${maxY}`}
        style={{ cursor: dragRef.current ? 'grabbing' : 'grab', display: 'block' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill={TOKENS.textMuted} />
            </marker>
            <marker id="arrow-risky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill={TOKENS.critical} />
            </marker>
          </defs>

          {path.edges.map((edge) => {
            const source = path.nodes.find((n) => n.id === edge.source);
            const target = path.nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            const sx = source.x ?? 0;
            const sy = source.y ?? 0;
            const tx = target.x ?? 0;
            const ty = target.y ?? 0;
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;
            const dim = (hoveredId || selectedNodeId) && !highlightedNodeIds.has(edge.source) && !highlightedNodeIds.has(edge.target);
            return (
              <g key={edge.id} opacity={dim ? 0.25 : 1}>
                <line
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke={edge.risky ? TOKENS.critical : TOKENS.border}
                  strokeWidth={edge.risky ? 2 : 1.4}
                  markerEnd={edge.risky ? 'url(#arrow-risky)' : 'url(#arrow)'}
                />
                {edge.label && (
                  <text x={midX} y={midY - 6} fontSize={9.5} fill={edge.risky ? TOKENS.critical : TOKENS.textMuted} textAnchor="middle" fontWeight={600}>
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {path.nodes.map((node) => {
            const Icon = ATTACK_NODE_ICON[node.type];
            const color = node.severity ? severityColor(node.severity) : TOKENS.textMuted;
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredId === node.id;
            const dim = (hoveredId || selectedNodeId) && !highlightedNodeIds.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                style={{ cursor: 'pointer' }}
                opacity={dim ? 0.35 : 1}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(isSelected ? null : node);
                }}
              >
                <circle
                  r={NODE_R}
                  fill={TOKENS.bg}
                  stroke={color}
                  strokeWidth={isSelected || isHovered ? 3 : 2}
                  style={{ filter: isSelected ? 'drop-shadow(0 2px 6px rgba(60,64,67,0.3))' : 'drop-shadow(0 1px 2px rgba(60,64,67,0.15))' }}
                />
                <g transform={`translate(${-9} ${-9})`}>
                  <Icon size={18} color={color} />
                </g>
                <text y={NODE_R + 16} textAnchor="middle" fontSize={11} fontWeight={500} fill={TOKENS.textPrimary}>
                  {node.label}
                </text>
                {node.severity && (
                  <text y={NODE_R + 29} textAnchor="middle" fontSize={9} fill={color} fontWeight={700}>
                    {node.severity}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
