import { useEffect, useState } from 'react';
import { UserCog } from 'lucide-react';
import KPICard from '../components/common/KPICard';
import ProgressBar from '../components/common/ProgressBar';
import { getAssets } from '../lib/api';

const IDENTITY_RISKS = [
  { identity: 'svc-payments-deploy', type: 'Service Account', privilege: 'Admin', mfa: false, risk: 'CRITICAL' },
  { identity: 'r.verma@novapay.com', type: 'Human — Platform Infra', privilege: 'Cluster Admin', mfa: true, risk: 'MEDIUM' },
  { identity: 'svc-ci-runner', type: 'Service Account', privilege: 'AssumeRole (S3, EC2, RDS)', mfa: false, risk: 'HIGH' },
  { identity: 'a.mehta@novapay.com', type: 'Human — Payments', privilege: 'Production DB Write', mfa: true, risk: 'LOW' },
  { identity: 'svc-auth-legacy', type: 'Service Account', privilege: 'IAM PassRole', mfa: false, risk: 'HIGH' },
];

import { TOKENS } from '../utils/format';

const RISK_COLOR: Record<string, string> = { CRITICAL: TOKENS.critical, HIGH: TOKENS.sevHigh, MEDIUM: TOKENS.warning, LOW: TOKENS.success };

export default function IdentitySecurity() {
  const [assets, setAssets] = useState<any[]>([]);
  const mfaPercent = (asset: any) => {
    if (typeof asset.controls?.mfa_coverage === 'number') return Math.round(asset.controls.mfa_coverage * 100);
    return Math.round(asset.controls?.mfa_pct ?? 0);
  };
  const avgMfa = assets.length ? Math.round(assets.reduce((total, asset) => total + mfaPercent(asset), 0) / assets.length) : 0;

  useEffect(() => {
    getAssets().then((response) => {
      if (Array.isArray(response)) setAssets(response);
    });
  }, []);

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCog size={22} color="var(--color-primary-blue)" /> Identity Security
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Privileged access review, MFA coverage, and over-privileged identity detection
        </p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Tracked Identities" value="248" accentColor={TOKENS.primaryBlue} icon={<UserCog size={16} />} />
        <KPICard title="Avg. MFA Coverage" value={`${avgMfa}%`} accentColor={avgMfa >= 70 ? TOKENS.success : TOKENS.sevHigh} icon={<UserCog size={16} />} />
        <KPICard title="Over-Privileged Accounts" value="8" subtitle="Admin rights not required" accentColor={TOKENS.critical} icon={<UserCog size={16} />} />
        <KPICard title="Stale Credentials" value="14" subtitle="Unused for 90+ days" accentColor={TOKENS.warning} icon={<UserCog size={16} />} />
      </div>

      <div className="card">
        <div className="card-title">Privileged Identity Risk</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Identity</th>
              <th>Type</th>
              <th>Privilege</th>
              <th>MFA</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {IDENTITY_RISKS.map((i) => (
              <tr key={i.identity}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{i.identity}</td>
                <td style={{ color: 'var(--text-muted)' }}>{i.type}</td>
                <td>{i.privilege}</td>
                <td>{i.mfa ? <span style={{ color: 'var(--sev-low)', fontWeight: 700 }}>Enabled</span> : <span style={{ color: 'var(--sev-critical)', fontWeight: 700 }}>Missing</span>}</td>
                <td>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: RISK_COLOR[i.risk] }}>{i.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">MFA Coverage by Asset</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assets.map((a) => (
            <ProgressBar key={a.asset_id} value={mfaPercent(a)} color={mfaPercent(a) >= 70 ? TOKENS.success : TOKENS.critical} label={a.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
