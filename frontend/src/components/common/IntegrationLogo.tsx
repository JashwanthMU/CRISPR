import { getIntegrationVisual } from '../../config/integrations';

interface Props {
  integrationKey: string;
  size?: number;
}

/** Consistent SVG "brand chip" for any integration/source, driven by src/config/integrations.ts. */
export default function IntegrationLogo({ integrationKey, size = 28 }: Props) {
  const { color, icon: Icon, label } = getIntegrationVisual(integrationKey);
  return (
    <div
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 28 ? 8 : 6,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.6)} color="#fff" strokeWidth={2} />
    </div>
  );
}
