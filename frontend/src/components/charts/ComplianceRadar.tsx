import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  data: { framework: string; score: number }[];
  height?: number;
}

const LABELS: Record<string, string> = {
  ISO_27001: 'ISO 27001',
  NIST_CSF: 'NIST CSF',
  CIS_CONTROLS: 'CIS Controls',
  RBI_CSF: 'RBI CSF',
  SEBI_CSCRF: 'SEBI CSCRF',
};

export default function ComplianceRadar({ data, height = 280 }: Props) {
  const chartData = data.map((d) => ({ framework: LABELS[d.framework] || d.framework, score: d.score }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="#30363d" />
        <PolarAngleAxis dataKey="framework" tick={{ fill: '#8b949e', fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#484f58', fontSize: 10 }} />
        <Radar name="Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
