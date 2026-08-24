import { riskColor } from '../../utils/format';

interface Props {
  score: number;
  size?: number;
}

export default function RiskScoreBadge({ score, size = 48 }: Props) {
  const color = riskColor(score);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: `${color}14`,
      }}
    >
      <span style={{ fontWeight: 800, fontSize: size / 2.6, color }}>{score}</span>
    </div>
  );
}
