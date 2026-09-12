import { useLanguage } from '../lib/i18n';
import LanguageSelector from '../components/common/LanguageSelector';
import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { AuthSession, getSession, setSession } from '../lib/auth';
import { getWorkspace, setWorkspace, SIH_WORKSPACE_ENABLED, type Workspace } from '../lib/workspace';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const DEMO_ACCOUNTS: Record<Workspace, { email: string; password: string }> = {
  executive: {
    email: (import.meta as any).env?.VITE_SIH_EXECUTIVE_EMAIL || '',
    password: (import.meta as any).env?.VITE_SIH_EXECUTIVE_PASSWORD || '',
  },
  technical: {
    email: (import.meta as any).env?.VITE_SIH_TECHNICAL_EMAIL || '',
    password: (import.meta as any).env?.VITE_SIH_TECHNICAL_PASSWORD || '',
  },
};

export default function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const initialWorkspace = getWorkspace();
  const [email, setEmail] = useState(() => SIH_WORKSPACE_ENABLED ? DEMO_ACCOUNTS[initialWorkspace].email : '');
  const [password, setPassword] = useState(() => SIH_WORKSPACE_ENABLED ? DEMO_ACCOUNTS[initialWorkspace].password : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [workspace, chooseWorkspace] = useState<Workspace>(initialWorkspace);

  const selectDemoWorkspace = (selectedWorkspace: Workspace) => {
    chooseWorkspace(selectedWorkspace);
    const account = DEMO_ACCOUNTS[selectedWorkspace];
    if (account.email && account.password) {
      setEmail(account.email);
      setPassword(account.password);
    }
    setError('');
  };

  const existingSession = getSession();
  if (existingSession) {
    const existingWorkspace = existingSession.user.workspace ?? getWorkspace();
    return <Navigate to={SIH_WORKSPACE_ENABLED && existingWorkspace === 'executive' ? '/executive' : '/security'} replace />;
  }

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
      let session = body as AuthSession;
      if (session.user.role !== 'SECURITY') {
        throw new Error('This console is restricted to the security team.');
      }
      if (SIH_WORKSPACE_ENABLED) {
        const organizationsResponse = await fetch(`${API_BASE}/api/auth/organizations`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const organizationsBody = await organizationsResponse.json().catch(() => ({}));
        const demoOrganization = organizationsBody.organizations?.find((organization: { data_mode?: string }) => organization.data_mode === 'DEMO');
        if (organizationsResponse.ok && demoOrganization?.id && session.user.organization_id !== demoOrganization.id) {
          const switchResponse = await fetch(`${API_BASE}/api/auth/organizations/${demoOrganization.id}/switch`, {
            method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const switchBody = await switchResponse.json().catch(() => ({}));
          if (!switchResponse.ok) throw new Error(switchBody.detail || 'Unable to open the demo organization');
          session = switchBody as AuthSession;
        }
      }
      // Never trust the browser selector to grant a workspace. The backend
      // derives this assignment from the authenticated account.
      const accountWorkspace = session.user.workspace;
      if (SIH_WORKSPACE_ENABLED && !accountWorkspace) {
        throw new Error('This account is not assigned to an SIH workspace.');
      }
      if (SIH_WORKSPACE_ENABLED && accountWorkspace) setWorkspace(accountWorkspace);
      setSession(session);
      const requestedDestination = (location.state as { from?: string } | null)?.from;
      const destination = SIH_WORKSPACE_ENABLED
        ? (accountWorkspace === 'executive' ? '/executive' : '/security')
        : requestedDestination || '/security';
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
            <div className="reference-login-kicker">{t("CYBER RISK INTELLIGENCE")}</div>
            <h1>{t("See technical risk in financial terms.")}</h1>
            <p>{t("Unify security findings, quantify exposure, and prioritize the investments that reduce business risk.")}</p>

            <div className="reference-login-benefits">
              <div><p><strong>{t("₹-based risk")}</strong><small>{t("Translate findings into expected loss")}</small></p></div>
              <div><p><strong>{t("Unified evidence")}</strong><small>{t("Correlate signals across security tools")}</small></p></div>
              <div><p><strong>{t("Decision support")}</strong><small>{t("Model controls before you invest")}</small></p></div>
            </div>
          </div>

          <div className="reference-login-story-footer"><strong>{t("Security operations")}</strong><span>{t("Enterprise risk intelligence")}</span></div>
        </aside>

        <section className="reference-login-form-area" aria-labelledby="login-title">
          <div className="reference-login-form-wrap">
            <div className="login-language"><LanguageSelector /></div>
            <h2 id="login-title">{t("Welcome back")}</h2>
            <p className="reference-login-intro">{t(SIH_WORKSPACE_ENABLED ? 'Choose your workspace, then enter your credentials.' : 'Enter your credentials to access the security operations console.')}</p>

            <form onSubmit={submit}>
              {SIH_WORKSPACE_ENABLED && <fieldset className="demo-workspace-fieldset">
                <div className="demo-workspace-heading">
                  <legend>{t("Select demo workspace")}</legend>
                  <span>{t('Quick switch autofills credentials')}</span>
                </div>
                <div className="demo-workspace-grid">
                  {([
                    ['executive', 'Executive', 'Financial risk and decisions', BarChart3],
                    ['technical', 'Technical', 'Security operations and evidence', ShieldCheck],
                  ] as const).map(([value, label, description, Icon]) => {
                    const selected = workspace === value;
                    const account = DEMO_ACCOUNTS[value];
                    return <button key={value} type="button" className={`demo-workspace-card${selected ? ' selected' : ''}`} onClick={() => selectDemoWorkspace(value)} aria-pressed={selected}>
                      <span className="demo-workspace-card-top">
                        <span className="demo-workspace-icon"><Icon size={15} /></span>
                        {selected && <span className="demo-workspace-selected">✓ {t('Selected')}</span>}
                      </span>
                      <strong className="demo-workspace-title">{t(label)}</strong>
                      <span className="demo-workspace-description">{t(description)}</span>
                      <span className="demo-workspace-profile">
                        <small>{t('Demo profile')}</small>
                        <strong data-no-translate>{account.email || t('Not configured')}</strong>
                      </span>
                    </button>;
                  })}
                </div>
              </fieldset>}
              <div className="reference-login-field">
                <label htmlFor="email">{t("Email address")}</label>
                <div className="reference-login-input">
                  <Mail size={17} aria-hidden="true" />
                  <input id="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
              </div>
              <div className="reference-login-field">
                <label htmlFor="password">{t("Password")}</label>
                <div className="reference-login-input reference-login-password">
                  <KeyRound size={17} aria-hidden="true" />
                  <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t("Enter your password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={t(showPassword ? 'Hide password' : 'Show password')} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              {error && <div className="reference-login-error" role="alert">{error}</div>}
              <button className="reference-login-submit" type="submit" disabled={submitting}>
                <span>{t(submitting ? 'Signing in…' : SIH_WORKSPACE_ENABLED ? (workspace === 'executive' ? 'Open Executive Workspace' : 'Open Technical Workspace') : 'Sign in')}</span>
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
