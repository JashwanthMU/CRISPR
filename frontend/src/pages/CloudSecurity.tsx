import { Cloud } from 'lucide-react';
import KPICard from '../components/common/KPICard';
import IntegrationLogo from '../components/common/IntegrationLogo';
import ProgressBar from '../components/common/ProgressBar';
import { TOKENS } from '../utils/format';

const CLOUD_ACCOUNTS = [
  { provider: 'aws', name: 'novapay-prod', resources: 312, misconfigs: 27, score: 68 },
  { provider: 'aws', name: 'novapay-staging', resources: 94, misconfigs: 8, score: 84 },
  { provider: 'azure', name: 'novapay-corp (disconnected)', resources: 0, misconfigs: 0, score: 0 },
];

const TOP_MISCONFIGS = [
  { rule: 'S3 bucket allows public read access', resource: 'novapay-customer-exports', severity: 'CRITICAL', service: 'S3' },
  { rule: 'Security group allows unrestricted ingress on port 22', resource: 'novapay-prod-bastion', severity: 'HIGH', service: 'EC2' },
  { rule: 'IAM role has wildcard (*) resource permissions', resource: 'payments-service-role', severity: 'HIGH', service: 'IAM' },
  { rule: 'RDS instance without encryption at rest', resource: 'payments-db-replica', severity: 'CRITICAL', service: 'RDS' },
  { rule: 'CloudTrail logging disabled in one region', resource: 'ap-south-2', severity: 'MEDIUM', service: 'CloudTrail' },
];

export default function CloudSecurity() {
  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cloud size={22} color="var(--color-primary-blue)" /> Cloud Security
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Cloud security posture management (CSPM) across connected accounts
        </p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Cloud Resources" value="406" accentColor={TOKENS.primaryBlue} icon={<Cloud size={16} />} />
        <KPICard title="Misconfigurations" value="35" subtitle="2 critical, 13 high" accentColor={TOKENS.critical} icon={<Cloud size={16} />} />
        <KPICard title="Public Storage Buckets" value="1" subtitle="Requires immediate review" accentColor={TOKENS.sevHigh} icon={<Cloud size={16} />} />
        <KPICard title="Avg. Account Score" value="76" unit="/100" accentColor={TOKENS.success} icon={<Cloud size={16} />} />
      </div>

      <div className="card">
        <div className="card-title">Connected Cloud Accounts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CLOUD_ACCOUNTS.map((acc) => (
            <div
              key={acc.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                opacity: acc.resources === 0 ? 0.5 : 1,
              }}
            >
              <IntegrationLogo integrationKey={acc.provider} size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: '0.8125rem' }}>{acc.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{acc.resources} resources · {acc.misconfigs} misconfigurations</div>
              </div>
              <div style={{ width: 140 }}>
                <ProgressBar value={acc.score} color={acc.score >= 80 ? TOKENS.success : acc.score >= 60 ? TOKENS.sevHigh : TOKENS.critical} label="Score" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Top Cloud Misconfigurations</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Resource</th>
              <th>Service</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {TOP_MISCONFIGS.map((m) => (
              <tr key={m.rule}>
                <td>{m.rule}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{m.resource}</td>
                <td>{m.service}</td>
                <td>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color:
                        m.severity === 'CRITICAL' ? 'var(--sev-critical)' : m.severity === 'HIGH' ? 'var(--sev-high)' : 'var(--sev-medium)',
                    }}
                  >
                    {m.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
