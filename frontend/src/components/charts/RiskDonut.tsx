import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { sourceColor, sourceLabel, TOKENS } from '../../utils/format';

interface Props {
  data: { source: string; count: number }[];
  height?: number;
}

export default function RiskDonut({ data, height = 220 }: Props) {
  const chartData = data.filter((d) => d.count > 0);
  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  if (!chartData.length) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: TOKENS.textSecondary, fontSize: 13 }}>
        No findings by source
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="source"
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={76}
          paddingAngle={2}
          startAngle={90}
          endAngle={-270}
          isAnimationActive
          animationDuration={500}
        >
          {chartData.map((d) => (
            <Cell key={d.source} fill={sourceColor(d.source)} stroke={TOKENS.bg} strokeWidth={2} />
          ))}
          <Label
            position="center"
            content={({ viewBox }) => {
              const box = viewBox as { cx?: number; cy?: number } | undefined;
              if (box?.cx == null || box.cy == null) return null;
              return (
                <g>
                  <text x={box.cx} y={box.cy - 3} textAnchor="middle" fill={TOKENS.textPrimary} fontSize="22" fontWeight="600">{total}</text>
                  <text x={box.cx} y={box.cy + 16} textAnchor="middle" fill={TOKENS.textSecondary} fontSize="11">Findings</text>
                </g>
              );
            }}
          />
        </Pie>
        <Tooltip
          contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }}
          formatter={(value: number, name: string) => [value, sourceLabel(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
