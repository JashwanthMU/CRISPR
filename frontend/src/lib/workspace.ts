import { getSession } from './auth';

export type Workspace = 'executive' | 'technical';

const KEY = 'crispr_sih_workspace';

export const SIH_WORKSPACE_ENABLED = (import.meta as any).env?.VITE_SIH_WORKSPACE === 'true';

const EXECUTIVE_EMAIL = ((import.meta as any).env?.VITE_SIH_EXECUTIVE_EMAIL || '').trim().toLowerCase();
const TECHNICAL_EMAIL = ((import.meta as any).env?.VITE_SIH_TECHNICAL_EMAIL || '').trim().toLowerCase();

/** Resolve the workspace granted to one of the dedicated SIH identities. */
export function getIdentityWorkspace(email?: string): Workspace | null {
  if (!SIH_WORKSPACE_ENABLED || !email) return null;
  const normalized = email.trim().toLowerCase();
  if (EXECUTIVE_EMAIL && normalized === EXECUTIVE_EMAIL) return 'executive';
  if (TECHNICAL_EMAIL && normalized === TECHNICAL_EMAIL) return 'technical';
  return null;
}

export function getWorkspace(): Workspace {
  if (!SIH_WORKSPACE_ENABLED) return 'technical';
  return localStorage.getItem(KEY) === 'technical' ? 'technical' : 'executive';
}

/** Resolve the effective workspace. An authenticated backend claim always wins. */
export function getEffectiveWorkspace(): Workspace {
  const user = getSession()?.user;
  return user?.workspace ?? getIdentityWorkspace(user?.email) ?? getWorkspace();
}

export function setWorkspace(workspace: Workspace): void {
  localStorage.setItem(KEY, workspace);
  window.dispatchEvent(new CustomEvent('crispr:workspace-changed', { detail: workspace }));
}
