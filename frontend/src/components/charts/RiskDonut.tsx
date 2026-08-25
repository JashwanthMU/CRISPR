import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { sourceColor, sourceLabel, TOKENS } from '../../utils/format';

interface Props {
  data: { source: string; count: number }[];
  height?: number;
}

export default function RiskDonut({ data, height = 220 }: Props) {
  const chartData = data.filter((d) => d.count > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={chartData} dataKey="count" nameKey="source" cx="50%" cy="45%" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive animationDuration={500}>
          {chartData.map((d) => (
            <Cell key={d.source} fill={sourceColor(d.source)} stroke={TOKENS.bg} strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }}
          formatter={(value: number, name: string) => [value, sourceLabel(name)]}
        />
        <Legend
          verticalAlign="bottom"
          height={48}
          formatter={(value: string) => <span style={{ color: TOKENS.textSecondary, fontSize: 11 }}>{sourceLabel(value)}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
