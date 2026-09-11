import { RadarChart, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { TOKENS } from '../../utils/format';

interface Props {
  data: { framework: string; score: number }[];
  height?: number;
}

const LABELS: Record<string, string> = {
  ISO_27001: 'ISO 27001:2022',
  NIST_CSF: 'NIST CSF 2.0',
  CIS_CONTROLS: 'CIS v8.1',
  RBI_CSF: 'RBI CSF 2016',
  SEBI_CSCRF: 'SEBI CSCRF 2024',
};

export default function ComplianceRadar({ data, height = 280 }: Props) {
  const chartData = data.map((d) => ({ framework: LABELS[d.framework] || d.framework, score: d.score }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData}>
        <PolarAngleAxis dataKey="framework" tick={{ fill: TOKENS.textSecondary, fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: TOKENS.textMuted, fontSize: 10 }} />
        <Radar name="Score" dataKey="score" stroke={TOKENS.primaryBlue} fill={TOKENS.primaryBlue} fillOpacity={0.16} strokeWidth={2} isAnimationActive={false} />
        <Tooltip contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
