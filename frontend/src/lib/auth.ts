export interface SessionUser {
  user_id: string;
  name: string;
  email: string;
  role: 'REPORTER' | 'SECURITY';
}

export interface AuthSession {
  access_token: string;
  token_type: 'bearer';
  user: SessionUser;
}

const SESSION_KEY = 'crispr.security.session';

export function getSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as AuthSession : null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event('crispr:auth-changed'));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('crispr:auth-changed'));
}

export function getAccessToken(): string | null {
  return getSession()?.access_token ?? null;
}
