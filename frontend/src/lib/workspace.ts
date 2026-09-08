export type Workspace = 'executive' | 'technical';

const KEY = 'crispr_sih_workspace';

export const SIH_WORKSPACE_ENABLED = (import.meta as any).env?.VITE_SIH_WORKSPACE === 'true';

export function getWorkspace(): Workspace {
  if (!SIH_WORKSPACE_ENABLED) return 'technical';
  return localStorage.getItem(KEY) === 'technical' ? 'technical' : 'executive';
}

export function setWorkspace(workspace: Workspace): void {
  localStorage.setItem(KEY, workspace);
  window.dispatchEvent(new CustomEvent('crispr:workspace-changed', { detail: workspace }));
}
