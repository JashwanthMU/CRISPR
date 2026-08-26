import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { AuthSession, getSession, setSession } from '../lib/auth';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      if (!response.ok) {
        const message = response.status === 429
          ? 'Too many sign-in attempts. Please wait a minute and try again.'
          : body.detail || 'Unable to sign in';
        throw new Error(message);
      }
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
    <main className="reference-login">
      <section className="reference-login-shell">
        <aside className="reference-login-story">
          <div className="reference-login-logo"><strong>CRISPR</strong></div>

          <div className="reference-login-message">
            <div className="reference-login-kicker">CYBER RISK INTELLIGENCE</div>
            <h1>See technical risk in financial terms.</h1>
            <p>Unify security findings, quantify exposure, and prioritize the investments that reduce business risk.</p>

            <div className="reference-login-benefits">
              <div><p><strong>₹-based risk</strong><small>Translate findings into expected loss</small></p></div>
              <div><p><strong>Unified evidence</strong><small>Correlate signals across security tools</small></p></div>
              <div><p><strong>Decision support</strong><small>Model controls before you invest</small></p></div>
            </div>
          </div>

          <div className="reference-login-story-footer"><strong>Security operations</strong><span>Enterprise risk intelligence</span></div>
        </aside>

        <section className="reference-login-form-area" aria-labelledby="login-title">
          <div className="reference-login-form-wrap">
            <h2 id="login-title">Welcome back</h2>
            <p className="reference-login-intro">Enter your credentials to access the security operations console.</p>

            <form onSubmit={submit}>
              <div className="reference-login-field">
                <label htmlFor="email">Email address</label>
                <div className="reference-login-input">
                  <Mail size={17} aria-hidden="true" />
                  <input id="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
              </div>
              <div className="reference-login-field">
                <label htmlFor="password">Password</label>
                <div className="reference-login-input reference-login-password">
                  <KeyRound size={17} aria-hidden="true" />
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              {error && <div className="reference-login-error" role="alert">{error}</div>}
              <button className="reference-login-submit" type="submit" disabled={submitting}>
                <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
