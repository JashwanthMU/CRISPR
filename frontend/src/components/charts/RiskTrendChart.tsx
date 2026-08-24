import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { month: string; eal: number }[];
  color?: string;
  height?: number;
}

export default function RiskTrendChart({ data, color = '#ef4444', height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc' }}
          formatter={(value: number) => [`₹${value}L`, 'EAL']}
        />
        <Line type="monotone" dataKey="eal" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
