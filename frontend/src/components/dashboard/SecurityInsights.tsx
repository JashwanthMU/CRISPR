import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShieldAlert, Globe, KeyRound, UserCog, ArrowRight } from 'lucide-react';
import Carousel from '../common/Carousel';
import SeverityBadge from '../common/SeverityBadge';
import type { Severity } from '../../types';

interface Insight {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  severity: Severity;
  path: string;
  actionLabel: string;
}

const INSIGHTS: Insight[] = [
  {
    icon: TrendingUp,
    title: 'Risk score increased 12%',
    description: 'Enterprise risk climbed from 70 to 78 over the last 30 days, driven primarily by the Authentication API risk case.',
    severity: 'HIGH',
    path: '/risks',
    actionLabel: 'View Risk Cases',
  },
  {
    icon: ShieldAlert,
    title: '5 critical findings require attention',
    description: 'Validated bug bounty and vulnerability scanner findings on internet-facing payment infrastructure remain open.',
    severity: 'CRITICAL',
    path: '/findings?severity=CRITICAL',
    actionLabel: 'Investigate',
  },
  {
    icon: Globe,
    title: '3 internet-exposed assets detected',
    description: 'Public API, Authentication API, and Customer Portal are directly reachable from the internet without a WAF.',
    severity: 'HIGH',
    path: '/resources',
    actionLabel: 'View Resources',
  },
  {
    icon: KeyRound,
    title: 'Payment API contains a high-risk vulnerability',
    description: 'CVE-2024-3400 (SQL injection) is actively exploited in the wild and affects the Payment Database.',
    severity: 'CRITICAL',
    path: '/vulnerabilities',
    actionLabel: 'View Details',
  },
  {
    icon: UserCog,
    title: 'Cloud IAM privilege escalation path found',
    description: 'An over-privileged service role can be assumed from a public-facing compute instance in production.',
    severity: 'HIGH',
    path: '/attack-paths',
    actionLabel: 'Investigate',
  },
];

/** "Security Insights" — selective horizontal carousel, not an auto-scrolling whole page. */
export default function SecurityInsights() {
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>
        Security Insights
      </div>
      <Carousel autoAdvanceMs={6000} ariaLabel="Security insights">
        {INSIGHTS.map((insight) => {
          const Icon = insight.icon;
          return (
            <div className="insight-card" key={insight.title}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-blue-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary-blue)',
                  }}
                >
                  <Icon size={17} />
                </div>
                <SeverityBadge severity={insight.severity} />
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{insight.title}</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {insight.description}
              </p>
              <button
                className="btn-secondary"
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}
                onClick={() => navigate(insight.path)}
              >
                {insight.actionLabel} <ArrowRight size={13} />
              </button>
            </div>
          );
        })}
      </Carousel>
    </div>
  );
}
