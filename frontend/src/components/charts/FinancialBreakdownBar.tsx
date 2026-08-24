import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatRupees, TOKENS } from '../../utils/format';

interface Props {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}

// Restrained categorical palette (blue family + severity accents), replacing
// the previous saturated dark-theme rainbow.
const COLORS = [TOKENS.primaryBlue, TOKENS.secondaryBlue, TOKENS.sevHigh, TOKENS.warning, TOKENS.success, TOKENS.critical];

export default function FinancialBreakdownBar({ data, height = 260, color }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.divider} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: TOKENS.textMuted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatRupees(v)}
        />
        <YAxis type="category" dataKey="name" tick={{ fill: TOKENS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
        <Tooltip
          contentStyle={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}`, borderRadius: 8, color: TOKENS.textPrimary, boxShadow: '0 2px 6px rgba(60,64,67,0.15)' }}
          formatter={(value: number) => [formatRupees(value), 'Amount']}
          cursor={{ fill: TOKENS.blueSurface }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={color || TOKENS.primaryBlue} isAnimationActive animationDuration={500}>
          {!color && data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
