import { useLanguage } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { ScrollText, Download, Plus } from 'lucide-react';
import api from '../lib/api';
import { API_MODE, getReports } from '../lib/api';
import { toast } from '../lib/toastStore';
import { SkeletonTable } from '../components/common/Skeleton';
import { getWorkspace, SIH_WORKSPACE_ENABLED } from '../lib/workspace';

interface ReportItem {
  id: string;
  name: string;
  generated: string;
  format: string;
  description?: string;
  status?: string;
}

export default function Reports() {
  const { t } = useLanguage();
  const executiveView = SIH_WORKSPACE_ENABLED && getWorkspace() === 'executive';
  const [reports, setReports] = useState<ReportItem[] | null>(null);

  useEffect(() => {
    if (API_MODE === 'demo') {
      getReports().then((items: any) => setReports(items));
      return;
    }
    api.get('/api/reports').then((res) => {
      setReports(res.data.reports);
    });
  }, []);

  const loadReports = () => api.get('/api/reports').then((res) => setReports(res.data.reports));

  const generateNew = async () => {
    const reportName = executiveView
      ? `Executive Cyber Risk Report — ${new Date().toISOString().slice(0, 10)}`
      : `Technical Security Operations Report — ${new Date().toISOString().slice(0, 10)}`;
    if (API_MODE === 'demo') {
      const report: ReportItem = { id: `demo-${Date.now()}`, name: reportName, generated: new Date().toISOString(), format: 'PDF', status: 'READY' };
      setReports((current) => [report, ...(current ?? [])]);
      toast.success('Demo report generated', 'The report is available for download.');
      return;
    }
    toast.info('Generating report…');
    try {
      await api.post('/api/reports', {
        report_type: executiveView ? 'RISK_SUMMARY' : 'FINDINGS_DIGEST',
        name: reportName,
        format: 'JSON',
      });
      await loadReports();
      toast.success('Report queued', 'The worker is generating the report from persisted findings.');
    } catch (error: any) {
      toast.error('Report generation failed', error?.response?.data?.detail ?? error.message);
    }
  };

  const downloadReport = async (_reportId: string, name: string) => {
    try {
      toast.info('Preparing professional PDF…');
      const { downloadDashboardPdf } = await import('../lib/reportPdf');
      await downloadDashboardPdf(executiveView ? 'executive' : 'technical', name);
      toast.success('PDF download complete', `${name}.pdf`);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScrollText size={22} color="var(--color-primary-blue)" /> {executiveView ? 'Executive & Regulatory Reports' : SIH_WORKSPACE_ENABLED ? 'Technical Reports' : 'Reports'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            {executiveView ? 'Board, financial exposure, investment and regulatory reporting' : 'Evidence-based operational and compliance reports generated from current risk data'}
          </p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={generateNew}>
          <Plus size={14} /> Generate Report
        </button>
      </div>

      <div className="card">
        {!reports ? (
          <SkeletonTable rows={4} cols={3} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Generated</th>
                <th>Format</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description ?? r.status}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(r.generated).toLocaleString()}</td>
                  <td>PDF</td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => downloadReport(r.id, r.name)}
                    >
                      <Download size={12} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
