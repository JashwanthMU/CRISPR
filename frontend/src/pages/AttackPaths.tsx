import { useState, useEffect } from 'react';
import { Route } from 'lucide-react';
import api from '../lib/api';

interface AttackPath {
  id: string;
  start: string;
  target: string;
  risk_score: number;
}

export default function AttackPaths() {
  const [paths, setPaths] = useState<AttackPath[]>([]);

  useEffect(() => {
    api.get('/api/attack-paths').then((res) => {
      setPaths(res.data || []);
    });
  }, []);

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Route size={22} color="var(--color-primary-blue)" /> Attack Paths
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Visualized paths of compromise
        </p>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Start</th>
              <th>Target</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {paths.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.id}</td>
                <td>{p.start}</td>
                <td>{p.target}</td>
                <td>{p.risk_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
