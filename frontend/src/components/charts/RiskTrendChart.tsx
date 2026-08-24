import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TOKENS } from '../../utils/format';

interface Props {
  data: { month: string; eal: number }[];
  color?: string;
  height?: number;
}

export default function RiskTrendChart({ data, color = TOKENS.critical, height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.divider} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} />
        <Tooltip
          contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }}
          formatter={(value: number) => [`₹${value}L`, 'EAL']}
          cursor={{ stroke: TOKENS.border, strokeDasharray: '3 3' }}
        />
        <Line type="monotone" dataKey="eal" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive animationDuration={500} />
      </LineChart>
    </ResponsiveContainer>
  );
}
