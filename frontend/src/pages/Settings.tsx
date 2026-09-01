import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import api from '../lib/api';
import { toast } from '../lib/toastStore';

export default function Settings() {
  const [orgName, setOrgName] = useState('');
  const [alertEmail, setAlertEmail] = useState('');

  useEffect(() => {
    api.get('/api/settings').then((res) => {
      setOrgName(res.data.org_name || '');
      setAlertEmail(res.data.alert_email || '');
    });
  }, []);

  const handleSave = async () => {
    try {
      await api.patch('/api/settings', { org_name: orgName, alert_email: alertEmail });
      toast.success('Settings saved');
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SettingsIcon size={22} color="var(--color-primary-blue)" /> Settings
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Organization configuration
        </p>
      </div>

      <div className="card" style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Organization Name</label>
          <input
            type="text"
            className="search-input"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Alert Email</label>
          <input
            type="email"
            className="search-input"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
}
