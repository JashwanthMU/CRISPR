import { severityClass, severityColor } from '../../utils/format';

interface Props {
  severity: string;
}

export default function SeverityBadge({ severity }: Props) {
  return (
    <span
      className={severityClass(severity)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: severityColor(severity),
          display: 'inline-block',
        }}
      />
      {severity}
    </span>
  );
}
