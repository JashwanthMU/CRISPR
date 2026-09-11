import { useLanguage } from '../lib/i18n';
import { useState, useEffect } from 'react';
import { Inbox, GitPullRequest, UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import SeverityBadge from '../components/common/SeverityBadge';
import KPICard from '../components/common/KPICard';
import OpenPrModal from '../components/codesecurity/OpenPrModal';
import { formatRupees, TOKENS } from '../utils/format';
import { toast } from '../lib/toastStore';
import type { RemediationScenario, ScenarioStatus } from '../types';
import api from '../lib/api';
import { API_MODE } from '../lib/api';
import { REMEDIATION_SCENARIOS } from '../demo/fixtures';
import DeliveryIssueModal, { DeliveryIssueInput } from '../components/remediation/DeliveryIssueModal';

const STATUS_LABEL: Record<ScenarioStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  PR_OPENED: 'PR Opened',
  RESOLVED: 'Resolved',
  BLOCKED: 'Blocked', AT_RISK: 'At Risk', VERIFIED: 'Verified',
};

const STATUS_COLOR: Record<ScenarioStatus, string> = {
  NOT_STARTED: TOKENS.textMuted,
  IN_PROGRESS: TOKENS.secondaryBlue,
  PR_OPENED: TOKENS.primaryBlue,
  RESOLVED: TOKENS.success,
  BLOCKED: TOKENS.critical, AT_RISK: TOKENS.sevHigh, VERIFIED: TOKENS.success,
};

const normalizeItem = (item: any): RemediationScenario => ({
  ...item,
  finding: item.finding ?? item.finding_id ?? 'Unlinked finding',
  affectedResource: item.affectedResource ?? item.asset_id ?? 'Unlinked asset',
  recommendedFix: item.recommendedFix ?? item.recommended_fix ?? '',
  estimatedEffort: item.estimatedEffort ?? item.metadata?.estimated_effort ?? 'Not estimated',
  riskReductionInr: Number(item.riskReductionInr ?? item.risk_reduction_inr ?? 0),
  repository: item.repository ?? item.metadata?.repository,
  branch: item.branch ?? item.metadata?.branch,
  ticketKey: item.ticketKey ?? item.ticket_key ?? `REM-${String(item.id).slice(-6).toUpperCase()}`,
  plannedDueAt: item.plannedDueAt ?? item.planned_due_at,
  forecastDueAt: item.forecastDueAt ?? item.forecast_due_at,
  capabilityStatus: item.capabilityStatus ?? item.capability_status ?? 'READY',
  backupOwner: item.backupOwner ?? item.backup_owner,
  realizedRiskReductionInr: Number(item.realizedRiskReductionInr ?? item.realized_risk_reduction_inr ?? 0),
  openDeliveryIssues: Number(item.openDeliveryIssues ?? 0),
});

export default function RemediationQueue() {
  const { t } = useLanguage();
  const [scenarios, setScenarios] = useState<RemediationScenario[]>(API_MODE === 'demo' ? REMEDIATION_SCENARIOS : []);
  const [prTarget, setPrTarget] = useState<RemediationScenario | null>(null);
  const [issueTarget, setIssueTarget] = useState<RemediationScenario | null>(null);

  useEffect(() => {
    if (API_MODE === 'demo') return;
    api.get('/api/remediation').then((res) => {
      setScenarios((res.data.items || []).map(normalizeItem));
    });
  }, []);

  const updateStatus = async (id: string, status: ScenarioStatus) => {
    if (API_MODE === 'demo') {
      setScenarios((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
      return;
    }
    try {
      const current = scenarios.find((item) => item.id === id);
      if (!current) return;
      const res = await api.patch(`/api/remediation/${id}`, { status, expected_version: current.version ?? 1 });
      setScenarios((prev) => prev.map((s) => (s.id === id ? normalizeItem(res.data) : s)));
    } catch (e) {
      toast.error('Update failed', 'Could not update status');
    }
  };

  const assign = async (s: RemediationScenario) => {
    if (API_MODE === 'demo') {
      setScenarios((prev) => prev.map((item) => item.id === s.id ? { ...item, owner: { name: 'Current User', initials: 'CU', team: 'Security' }, status: 'IN_PROGRESS' } : item));
      toast.success('Assigned', `${s.title} assigned to you.`);
      return;
    }
    try {
      const res = await api.post(`/api/remediation/${s.id}/assign`, {
        owner_name: 'Current User',
        owner_initials: 'CU',
        owner_team: 'Security',
        expected_version: s.version ?? 1,
      });
      setScenarios((prev) => prev.map((item) => (item.id === s.id ? normalizeItem(res.data) : item)));
      toast.success('Assigned', `${s.title} assigned to you.`);
    } catch (e) {
      toast.error('Assignment failed', 'Could not assign issue');
    }
  };

  const markResolved = (s: RemediationScenario) => {
    updateStatus(s.id, 'RESOLVED');
    toast.success('Marked resolved', s.title);
  };

  const totalRiskReduction = scenarios.filter((s) => !['RESOLVED', 'VERIFIED'].includes(s.status)).reduce((a, s) => a + Math.max(0, s.riskReductionInr - (s.realizedRiskReductionInr ?? 0)), 0);
  const reportIssue = async (issue: DeliveryIssueInput) => {
    if (!issueTarget) return;
    if (API_MODE !== 'demo') await api.post(`/api/remediation/${issueTarget.id}/issues`, issue);
    setScenarios((prev) => prev.map((s) => s.id === issueTarget.id ? { ...s, status: 'AT_RISK', openDeliveryIssues: (s.openDeliveryIssues ?? 0) + 1 } : s));
    toast.warning('Delivery issue reported', 'The ticket forecast and risk reduction are now at risk.');
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Inbox size={22} color="var(--color-primary-blue)" /> {t("Remediation Queue")}
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Track and action remediation work end-to-end, from assignment to resolution
        </p>
      </div>

      <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard title="Open Items" value={scenarios.filter((s) => !['RESOLVED', 'VERIFIED'].includes(s.status)).length} accentColor={TOKENS.sevHigh} icon={<Inbox size={16} />} />
        <KPICard title="In Progress" value={scenarios.filter((s) => s.status === 'IN_PROGRESS').length} accentColor={TOKENS.secondaryBlue} icon={<Inbox size={16} />} />
        <KPICard title="Resolved" value={scenarios.filter((s) => s.status === 'RESOLVED').length} accentColor={TOKENS.success} icon={<CheckCircle2 size={16} />} />
        <KPICard title="Pending Risk Reduction" value={formatRupees(totalRiskReduction)} accentColor={TOKENS.critical} icon={<Inbox size={16} />} />
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket / Scenario</th>
              <th>Priority</th>
              <th>Affected Resource</th>
              <th>Effort</th>
              <th>Risk Reduction</th>
              <th>{t("Owner")}</th>
              <th>Delivery Risk</th>
              <th>{t("Status")}</th>
              <th>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const realized = s.status === 'VERIFIED' ? s.riskReductionInr : (s.realizedRiskReductionInr ?? 0);
              const atRisk = Math.max(0, s.riskReductionInr - realized);
              return <tr key={s.id}>
                <td style={{ maxWidth: 260 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{s.ticketKey ?? `REM-${s.id.slice(-6).toUpperCase()}`}</div>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{s.finding}</div>
                </td>
                <td>
                  <SeverityBadge severity={s.priority} />
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.affectedResource}</td>
                <td>{s.estimatedEffort}</td>
                <td>
                  <div style={{ color: realized > 0 ? 'var(--sev-low)' : 'var(--text-primary)', fontWeight: 700 }}>{formatRupees(realized)} realized</div>
                  <div style={{ color: ['AT_RISK', 'BLOCKED'].includes(s.status) ? 'var(--sev-critical)' : 'var(--text-muted)', fontSize: '0.6875rem' }}>
                    {formatRupees(atRisk)} {['AT_RISK', 'BLOCKED'].includes(s.status) ? 'at risk' : 'potential'}
                  </div>
                </td>
                <td>{s.owner?.name ?? '—'}</td>
                <td><div style={{ fontSize: '0.6875rem', fontWeight: 700 }}>{(s.capabilityStatus ?? 'READY').replace(/_/g, ' ')}</div><div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{s.openDeliveryIssues ? `${s.openDeliveryIssues} open issue` : s.backupOwner ? `Backup: ${s.backupOwner.name}` : 'No open issues'}</div></td>
                <td>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status]}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {s.status !== 'RESOLVED' && s.status !== 'VERIFIED' && <button className="icon-btn" title="Report delivery issue" onClick={() => setIssueTarget(s)}><AlertTriangle size={13} /></button>}
                    {s.status === 'NOT_STARTED' && (
                      <button className="icon-btn" title="Assign" onClick={() => assign(s)}>
                        <UserPlus size={13} />
                      </button>
                    )}
                    {s.repository && s.status !== 'RESOLVED' && (
                      <button className="icon-btn" title="Create Pull Request" onClick={() => setPrTarget(s)}>
                        <GitPullRequest size={13} />
                      </button>
                    )}
                    {s.status !== 'RESOLVED' && (
                      <button className="icon-btn" title="Mark Resolved" onClick={() => markResolved(s)}>
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {prTarget && (
        <OpenPrModal
          open={!!prTarget}
          onClose={() => {
            updateStatus(prTarget.id, 'PR_OPENED');
            setPrTarget(null);
          }}
          repository={prTarget.repository ?? 'codesmiths/unknown'}
          branch={prTarget.branch ?? 'main'}
          packageName="requests"
          targetVersion="2.32.0"
          resourceLabel={prTarget.affectedResource}
        />
      )}
      {issueTarget && <DeliveryIssueModal open={!!issueTarget} ticketTitle={issueTarget.title} onClose={() => setIssueTarget(null)} onSubmit={reportIssue} />}
    </div>
  );
}
