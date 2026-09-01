import { useEffect, useState } from 'react';
import { ScrollText, Download, Plus } from 'lucide-react';
import api from '../lib/api';
import { toast } from '../lib/toastStore';
import { SkeletonTable } from '../components/common/Skeleton';

interface ReportItem {
  id: string;
  name: string;
  generated: string;
  format: string;
  description: string;
}

export default function Reports() {
  const [reports, setReports] = useState<ReportItem[] | null>(null);

  useEffect(() => {
    api.get('/api/reports').then((res) => {
      setReports(res.data.reports);
    });
  }, []);

  const generateNew = () => {
    toast.info('Generating report…');
    setTimeout(() => {
      const newReport: ReportItem = {
        id: `rep-${Date.now()}`,
        name: 'Ad-hoc Security Posture Snapshot',
        description: 'Manual snapshot generated from live risk data',
        generated: new Date().toISOString().slice(0, 10),
        format: 'JSON',
      };
      setReports((prev) => [newReport, ...(prev ?? [])]);
      toast.success('Report generated', newReport.name);
    }, 1200);
  };

  const downloadReport = async (reportId: string, name: string) => {
    try {
      toast.info('Preparing download...');
      const res = await api.get(`/api/reports/${reportId}`);
      
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download complete', `${name}.json`);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScrollText size={22} color="var(--color-primary-blue)" /> Reports
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Board-ready and compliance reports generated from live risk data
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 300 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description}</div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.generated}</td>
                  <td>{r.format}</td>
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
