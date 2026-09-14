import { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const maxX = Math.max(320, ...path.nodes.map((n) => n.x ?? 0)) + 80;
  const maxY = Math.max(220, ...path.nodes.map((n) => n.y ?? 0)) + 80;

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

  useEffect(() => {
    const updateFullscreenState = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      // A small centered enlargement keeps dense/tall enterprise topologies
      // readable without cutting off their entry or target nodes.
      setZoom(active ? 1.08 : 1);
      setPan({ x: 0, y: 0 });
    };
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    setFullscreenError('');
    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen();
        return;
      }
      if (!containerRef.current?.requestFullscreen) {
        setFullscreenError('Fullscreen is not supported by this browser.');
        return;
      }
      await containerRef.current.requestFullscreen();
    } catch {
      setFullscreenError('The browser blocked fullscreen mode.');
    }
  };

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
      ref={containerRef}
      style={{
        position: 'relative',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, color-mix(in srgb, var(--color-primary-blue) 5%, var(--color-bg-secondary)), var(--color-bg-secondary))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
        width: '100%',
        height: isFullscreen ? '100vh' : undefined,
      }}
    >
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 5 }}>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.min(2.2, z + 0.2))} aria-label="Zoom in" title="Zoom in">
          <ZoomIn size={13} />
        </button>
        <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} aria-label="Zoom out" title="Zoom out">
          <ZoomOut size={13} />
        </button>
        <button className="icon-btn" onClick={resetView} aria-label="Reset graph view" title="Reset zoom and position">
          <RotateCcw size={13} />
        </button>
        <button className="icon-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
      {fullscreenError && <div role="alert" style={{ position: 'absolute', top: 48, right: 8, zIndex: 5, padding: '6px 9px', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--sev-critical)', fontSize: '0.6875rem', boxShadow: 'var(--shadow-sm)' }}>{fullscreenError}</div>}
      <svg
        width="100%"
        height={isFullscreen ? '100%' : height}
        viewBox={`0 0 ${maxX} ${maxY}`}
        style={{ cursor: dragRef.current ? 'grabbing' : 'grab', display: 'block' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g transform={`translate(${pan.x} ${pan.y}) translate(${maxX / 2} ${maxY / 2}) scale(${zoom}) translate(${-maxX / 2} ${-maxY / 2})`}>
          <defs>
            <pattern id="attack-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke={TOKENS.border} strokeWidth="0.45" opacity="0.5" />
            </pattern>
            <radialGradient id="node-surface" cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="white" stopOpacity="0.16" />
              <stop offset="100%" stopColor={TOKENS.bg} stopOpacity="1" />
            </radialGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill={TOKENS.textMuted} />
            </marker>
            <marker id="arrow-risky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill={TOKENS.critical} />
            </marker>
          </defs>
          <rect x="0" y="0" width={maxX} height={maxY} fill="url(#attack-grid)" />

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
                role="button"
                tabIndex={0}
                aria-label={`${node.label}${node.severity ? `, ${node.severity}` : ''}`}
                opacity={dim ? 0.35 : 1}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(isSelected ? null : node);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectNode?.(isSelected ? null : node);
                  }
                }}
              >
                <circle
                  r={NODE_R + 8}
                  fill={color}
                  opacity={isSelected || isHovered ? 0.16 : 0.07}
                />
                <circle
                  r={NODE_R}
                  fill="url(#node-surface)"
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
