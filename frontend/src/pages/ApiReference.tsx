import { useState } from 'react';
import { Terminal as TerminalIcon, Copy, Check } from 'lucide-react';
import { toast } from '../lib/toastStore';

const ENDPOINTS = [
  { method: 'GET', path: '/api/risks', description: 'List all correlated risk cases' },
  { method: 'GET', path: '/api/risks/enterprise', description: 'Enterprise-level risk score and financial exposure' },
  { method: 'GET', path: '/api/risks/:id', description: 'Get a single risk case by asset ID' },
  { method: 'GET', path: '/api/findings', description: 'List all findings across connected sources' },
  { method: 'GET', path: '/api/assets', description: 'List all monitored assets' },
  { method: 'GET', path: '/api/repositories', description: 'List all connected code repositories' },
  { method: 'GET', path: '/api/integrations', description: 'List integration status and sync health' },
  { method: 'POST', path: '/api/analysis/run', description: 'Trigger a full ingestion → correlation → risk scan' },
  { method: 'POST', path: '/api/optimize', description: 'Run the budget optimizer for a given spend' },
];

const CURL_EXAMPLE = `curl -X GET "https://api.crispr.novapay.io/api/risks" \\
  -H "Authorization: Bearer $CRISPR_API_KEY"`;

export default function ApiReference() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(CURL_EXAMPLE).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TerminalIcon size={22} color="var(--color-primary-blue)" /> API Reference
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Every UI action in CRISPR maps to one of these REST endpoints — the same abstraction layer used by the frontend.
        </p>
      </div>

      <div className="card">
        <div className="card-title">Example Request</div>
        <div className="terminal-window" style={{ height: 'auto', position: 'relative' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{CURL_EXAMPLE}</pre>
          <button
            className="icon-btn"
            style={{ position: 'absolute', top: 8, right: 8 }}
            onClick={copy}
            aria-label="Copy example request"
          >
            {copied ? <Check size={13} color="var(--sev-low)" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Endpoints</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr key={e.path + e.method}>
                <td>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: e.method === 'GET' ? 'var(--color-light-blue)' : 'var(--color-bg)',
                      border: e.method === 'GET' ? 'none' : '1px solid var(--color-success)',
                      color: e.method === 'GET' ? 'var(--color-primary-blue)' : 'var(--color-success)',
                    }}
                  >
                    {e.method}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{e.path}</td>
                <td style={{ color: 'var(--text-muted)' }}>{e.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
