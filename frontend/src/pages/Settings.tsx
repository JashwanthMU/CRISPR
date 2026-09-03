import { useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { toast } from '../lib/toastStore';
import api from '../lib/api';

export default function Settings() {
  const [orgName, setOrgName] = useState('NovaPay Financial Services');
  const apiMode: 'demo' | 'live' = (import.meta as any).env?.VITE_API_MODE === 'demo' ? 'demo' : 'live';
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (apiMode === 'demo') return;
    api.get('/api/settings').then(({ data }) => {
      if (data.org_name) setOrgName(data.org_name);
      if (typeof data.notify_critical === 'boolean') setNotifyCritical(data.notify_critical);
      if (typeof data.notify_weekly === 'boolean') setNotifyWeekly(data.notify_weekly);
      setVersion(data.version ?? 0);
    }).catch(() => toast.error('Settings unavailable', 'The backend could not load settings.'));
  }, [apiMode]);

  const save = async () => {
    if (apiMode === 'demo') {
      toast.success('Demo settings updated', 'Demo preferences are not persisted.');
      return;
    }
    try {
      const { data } = await api.patch('/api/settings', {
        expected_version: version, org_name: orgName, notify_critical: notifyCritical, notify_weekly: notifyWeekly,
      });
      setVersion(data.version);
      toast.success('Settings saved', 'Your workspace preferences have been persisted.');
    } catch {
      toast.error('Save failed', 'Reload settings and retry; another update may have won the version check.');
    }
  };

  return (
    <div className="page-container page-stack" style={{ maxWidth: 760 }}>
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingsIcon size={22} color="var(--color-primary-blue)" /> Settings
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Workspace, data source, and notification preferences
        </p>
      </div>

      <div className="card">
        <div className="card-title">Organization</div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Organization name</label>
        <input className="input-field" style={{ width: '100%', marginBottom: 16 }} value={orgName} onChange={(e) => setOrgName(e.target.value)} />

        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Data source mode</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span className="btn-primary" style={{ textTransform: 'capitalize' }}>{apiMode}</span>
        </div>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-subtle)' }}>
          Demo mode uses the deterministic fixture dataset. Live mode calls the NovaPay backend at the configured API URL
          with errors shown explicitly. Data mode is selected at build/deployment time and cannot be changed in the browser.
        </p>
      </div>

      <div className="card">
        <div className="card-title">Notifications</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={notifyCritical} onChange={(e) => setNotifyCritical(e.target.checked)} />
          <span style={{ fontSize: '0.8125rem' }}>Notify me immediately on new CRITICAL findings</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={notifyWeekly} onChange={(e) => setNotifyWeekly(e.target.checked)} />
          <span style={{ fontSize: '0.8125rem' }}>Send a weekly risk digest via Slack</span>
        </label>
      </div>

      <div>
        <button className="btn-primary" onClick={save}>
          Save changes
        </button>
      </div>
    </div>
  );
}
