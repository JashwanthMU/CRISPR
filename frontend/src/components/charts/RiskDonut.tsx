import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { sourceColor, sourceLabel } from '../../utils/format';

interface Props {
  data: { source: string; count: number }[];
  height?: number;
}

export default function RiskDonut({ data, height = 220 }: Props) {
  const chartData = data.filter((d) => d.count > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="source"
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
        >
          {chartData.map((d) => (
            <Cell key={d.source} fill={sourceColor(d.source)} stroke="var(--bg-surface)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc' }}
          formatter={(value: number, name: string) => [value, sourceLabel(name)]}
        />
        <Legend
          verticalAlign="bottom"
          height={48}
          formatter={(value: string) => <span style={{ color: '#8b949e', fontSize: 11 }}>{sourceLabel(value)}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
