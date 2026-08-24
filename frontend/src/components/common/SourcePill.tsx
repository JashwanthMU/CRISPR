import { sourceAbbrev, sourceColor } from '../../utils/format';

interface Props {
  source: string;
}

// Small pill used to show which intelligence sources correlate on a risk case (BB, VS, XDR, IAM, TI...)
export default function SourcePill({ source }: Props) {
  const color = sourceColor(source);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.6875rem',
        fontWeight: 700,
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {sourceAbbrev(source)}
    </span>
  );
}
