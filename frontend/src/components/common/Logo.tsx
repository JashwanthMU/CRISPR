import { CrisprMark } from '../../assets/branding/CrisprMark';
import { BRAND } from '../../config/branding';

interface Props {
  size?: number;
  withWordmark?: boolean;
  wordmarkSize?: number;
  mono?: boolean;
}

/** Re-exported for any code that still imports the old name. */
export function ShieldMark({ size = 22, mono = false }: { size?: number; mono?: boolean }) {
  return <CrisprMark size={size} mono={mono} />;
}

/**
 * CRISPR wordmark + mark. Renders through the centralized brand assets
 * (src/assets/branding, src/config/branding.ts) so every usage — sidebar,
 * top bar, command palette, loading states, demo pages — stays visually
 * identical without duplicating markup.
 */
export default function Logo({ size = 22, withWordmark = true, wordmarkSize = 16, mono = false }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <CrisprMark size={size} mono={mono} />
      {withWordmark && (
        <span
          style={{
            fontWeight: 500,
            fontSize: wordmarkSize,
            color: mono ? '#ffffff' : 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            fontFamily: "'Google Sans Text', Inter, system-ui, sans-serif",
          }}
          className="nav-label"
        >
          {BRAND.name}
        </span>
      )}
    </div>
  );
}
