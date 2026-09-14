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

export function getWorkspaceHome(workspace = getEffectiveWorkspace()): string {
  return workspace === 'executive' ? '/executive' : '/security';
}

const EXECUTIVE_PATHS = new Set([
  '/executive', '/financial', '/assets', '/resources', '/risks', '/attack-paths',
  '/threat-intelligence', '/scenarios', '/recommendations', '/investments',
  '/remediation-queue', '/compliance', '/reports',
]);

const TECHNICAL_PATHS = new Set([
  '/security', '/assets', '/findings', '/risks', '/attack-paths', '/vulnerabilities',
  '/secrets', '/threat-intelligence', '/cloud-security', '/identity-security',
  '/code-security', '/remediation-queue', '/scenarios', '/compliance', '/policies',
  '/reports', '/integrations', '/api-reference', '/settings', '/demo/vscode',
]);

/** True when a route belongs to the selected authenticated workspace. */
export function isWorkspacePathAllowed(path: string, workspace = getEffectiveWorkspace()): boolean {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  const allowed = workspace === 'executive' ? EXECUTIVE_PATHS : TECHNICAL_PATHS;
  if (allowed.has(pathname)) return true;
  return workspace === 'technical' && pathname.startsWith('/code-security/');
}

/** Prevent shared controls from navigating users into a route they cannot access. */
export function safeWorkspacePath(path: string, workspace = getEffectiveWorkspace()): string {
  return isWorkspacePathAllowed(path, workspace) ? path : getWorkspaceHome(workspace);
}

export function setWorkspace(workspace: Workspace): void {
  localStorage.setItem(KEY, workspace);
  window.dispatchEvent(new CustomEvent('crispr:workspace-changed', { detail: workspace }));
}
