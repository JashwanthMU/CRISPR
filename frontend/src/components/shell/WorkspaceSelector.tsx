import { BarChart3, ShieldCheck } from 'lucide-react';
import { getWorkspace, setWorkspace, type Workspace } from '../../lib/workspace';

export default function WorkspaceSelector({ collapsed }: { collapsed: boolean }) {
  const active = getWorkspace();
  const change = (workspace: Workspace) => {
    setWorkspace(workspace);
    window.location.assign(workspace === 'executive' ? '/executive' : '/security');
  };
  if (collapsed) {
    const executive = active === 'executive';
    return <button className="sidebar-utility-btn" title={`${executive ? 'Executive' : 'Technical'} Workspace`} onClick={() => change(executive ? 'technical' : 'executive')}>
      {executive ? <BarChart3 size={17} /> : <ShieldCheck size={17} />}
      <span className="nav-tooltip" role="tooltip">Switch to {executive ? 'Technical' : 'Executive'} Workspace</span>
    </button>;
  }
  return <div style={{ padding: '4px 12px 10px' }}>
    <label style={{ display: 'block', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Workspace</label>
    <select className="input-field" style={{ width: '100%' }} value={active} onChange={(e) => change(e.target.value as Workspace)} aria-label="Select workspace">
      <option value="executive">Executive</option>
      <option value="technical">Technical</option>
    </select>
  </div>;
}
