import { useState, useEffect } from 'react';
import { Skull } from 'lucide-react';
import api from '../lib/api';

interface ThreatActor {
  id: string;
  name: string;
  origin: string;
  targets: string[];
}

export default function ThreatIntelligence() {
  const [actors, setActors] = useState<ThreatActor[]>([]);

  useEffect(() => {
    api.get('/api/threat-intel/actors').then((res) => {
      setActors(res.data || []);
    });
  }, []);

  return (
    <div className="page-container page-stack">
      <div className="animate-in">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skull size={22} color="var(--color-primary-blue)" /> Threat Intelligence
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          Active threat actors and campaigns
        </p>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Origin</th>
              <th>Targets</th>
            </tr>
          </thead>
          <tbody>
            {actors.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td>{a.origin}</td>
                <td>{a.targets.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
