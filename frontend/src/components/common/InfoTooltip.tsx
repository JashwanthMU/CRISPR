import { ReactNode } from 'react';
import { Info } from 'lucide-react';

interface Props {
  text: string;
  children?: ReactNode;
}

/** Small inline info icon with hover/focus tooltip bubble. */
export default function InfoTooltip({ text, children }: Props) {
  return (
    <span className="tooltip-wrap" tabIndex={0}>
      {children ?? <Info size={12} color="var(--text-subtle)" />}
      <span className="tooltip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
