import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { AuthSession, getSession, setSession } from '../lib/auth';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (getSession()) return <Navigate to="/security" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || 'Unable to sign in');
      const session = body as AuthSession;
      if (session.user.role !== 'SECURITY') {
        throw new Error('This console is restricted to the security team.');
      }
      setSession(session);
      const destination = (location.state as { from?: string } | null)?.from || '/security';
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-brand"><Logo size={28} wordmarkSize={20} /></div>
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Sign in to CRISPR</h1>
        <p>Security operations console for NovaPay Financial Services</p>
        <form onSubmit={submit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
      <p className="login-help">Access is restricted to authorized security-team members.</p>
    </main>
  );
}

