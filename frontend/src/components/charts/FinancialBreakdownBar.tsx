import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatRupees } from '../../utils/format';

interface Props {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#7c3aed', '#06b6d4', '#2563eb'];

export default function FinancialBreakdownBar({ data, height = 260, color }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
        <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatRupees(v)} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc' }}
          formatter={(value: number) => [formatRupees(value), 'Amount']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color || '#2563eb'}>
          {!color && data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
