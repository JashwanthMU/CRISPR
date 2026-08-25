import { useState } from 'react';
import { Folder, FolderOpen, FileCode2, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FILE_TREE, FILE_CONTENTS, DemoFileNode } from '../demo/vscodeFixtures';
import { useDemoStore, runAnalysis } from '../demo/demoStore';
import Terminal from '../components/common/Terminal';

function FileTree({ nodes, activeFile, onSelect, depth = 0 }: { nodes: DemoFileNode[]; activeFile: string | null; onSelect: (n: DemoFileNode) => void; depth?: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(nodes.map((n) => n.path)));

  return (
    <div>
      {nodes.map((n) => {
        const isOpen = expanded.has(n.path);
        const isActive = activeFile === n.path;
        return (
          <div key={n.path}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                paddingLeft: 8 + depth * 14,
                fontSize: '0.75rem',
                borderRadius: 4,
                cursor: 'pointer',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onClick={() => {
                if (n.type === 'folder') {
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    next.has(n.path) ? next.delete(n.path) : next.add(n.path);
                    return next;
                  });
                } else {
                  onSelect(n);
                }
              }}
            >
              {n.type === 'folder' ? isOpen ? <FolderOpen size={13} /> : <Folder size={13} /> : <FileCode2 size={13} color="var(--accent-cyan)" />}
              {n.name}
              {n.stageId && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sev-medium)', marginLeft: 'auto' }} />}
            </div>
            {n.type === 'folder' && isOpen && n.children && (
              <FileTree nodes={n.children} activeFile={activeFile} onSelect={onSelect} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function highlightPython(code: string): string {
  // Syntax colors draw exclusively from the strict CRISPR palette.
  return code
    .replace(/</g, '&lt;')
    .replace(/(#.*$)/gm, '<span style="color:#5f6368">$1</span>')
    .replace(/\b(def|class|import|from|return|if|for|in|else|max|min)\b/g, '<span style="color:#d93025">$1</span>')
    .replace(/("""[\s\S]*?""")/g, '<span style="color:#188038">$1</span>')
    .replace(/\b(\d+\.\d+|\d+)\b/g, '<span style="color:#1a73e8">$1</span>');
}

export default function VSCodeDemo() {
  const activeFileFromEngine = useDemoStore((s) => s.activeFile);
  const timeline = useDemoStore((s) => s.timeline);
  const pipeline = useDemoStore((s) => s.pipeline);
  const isRunning = useDemoStore((s) => s.isRunning);
  const [manualFile, setManualFile] = useState<string | null>('src/api/routes.py');
  const [bottomTab, setBottomTab] = useState<'terminal' | 'problems' | 'output' | 'timeline'>('terminal');

  const activeFile = activeFileFromEngine ?? manualFile;
  const content = activeFile ? FILE_CONTENTS[activeFile] : undefined;

  const problems = [
    { file: 'src/ingestion/pipeline.py', line: 14, message: "Unused import 'json'", severity: 'warning' as const },
    { file: 'src/risk/scoring.py', line: 7, message: 'Magic number 0.4 should be a named constant', severity: 'info' as const },
    { file: 'src/api/routes.py', line: 3, message: "Missing type hint for 'settings'", severity: 'warning' as const },
  ];

  return (
    <div className="page-container animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="section-title">Developer Security Workspace</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            A live view into how CRISPR ingests, correlates, and scores this repository
          </p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => runAnalysis()} disabled={isRunning}>
          <Play size={14} /> {isRunning ? 'Running…' : 'Run Analysis'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows: '1fr 220px', gap: 12, minHeight: 0 }}>
        {/* Explorer */}
        <div className="card" style={{ gridRow: '1 / 3', padding: 12, overflowY: 'auto' }}>
          <div className="card-title" style={{ marginBottom: 8 }}>
            Explorer
          </div>
          <FileTree
            nodes={FILE_TREE}
            activeFile={activeFile}
            onSelect={(n) => setManualFile(n.path)}
          />
        </div>

        {/* Editor */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--bg-border)', padding: '8px 14px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCode2 size={13} color="var(--accent-cyan)" />
            <span style={{ fontFamily: 'monospace' }}>{activeFile ?? 'No file selected'}</span>
          </div>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 16,
              overflow: 'auto',
              fontFamily: "'SF Mono', Menlo, Consolas, monospace",
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}
            dangerouslySetInnerHTML={{ __html: content ? highlightPython(content) : '// Select a file from the explorer' }}
          />
        </div>

        {/* Bottom panel: terminal / problems / output / timeline */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="drawer-tabs" style={{ padding: '0 10px' }}>
            {(['terminal', 'problems', 'output', 'timeline'] as const).map((t) => (
              <button key={t} className={`drawer-tab${bottomTab === t ? ' active' : ''}`} onClick={() => setBottomTab(t)} style={{ textTransform: 'capitalize' }}>
                {t}
                {t === 'problems' && problems.length > 0 && <span style={{ marginLeft: 4, color: 'var(--sev-medium)' }}>({problems.length})</span>}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: bottomTab === 'terminal' ? 0 : 12 }}>
            {bottomTab === 'terminal' && <Terminal height={150} title="bash — crispr scan" />}
            {bottomTab === 'problems' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {problems.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.75rem', alignItems: 'flex-start' }}>
                    <AlertCircle size={13} color={p.severity === 'warning' ? 'var(--sev-medium)' : 'var(--accent-cyan)'} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{p.file}:{p.line}</span> — {p.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {bottomTab === 'output' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {pipeline.map((s) => (
                  <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {s.state === 'completed' ? (
                      <CheckCircle2 size={12} color="var(--sev-low)" />
                    ) : s.state === 'processing' ? (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--accent-cyan)' }} />
                    ) : (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--bg-border)' }} />
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}: {s.state} ({s.itemCount})</span>
                  </div>
                ))}
              </div>
            )}
            {bottomTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {timeline.slice(0, 10).map((t) => (
                  <div key={t.id} style={{ display: 'flex', gap: 8, fontSize: '0.75rem' }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        marginTop: 4,
                        flexShrink: 0,
                        background:
                          t.kind === 'success' ? 'var(--sev-low)' : t.kind === 'warning' ? 'var(--sev-medium)' : t.kind === 'error' ? 'var(--sev-critical)' : 'var(--accent-cyan)',
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
