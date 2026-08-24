import { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SelectFilter {
  key: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

interface Props {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  right?: ReactNode;
}

/** Shared search + dropdown filter row used across Findings/Assets/Risks/Vulnerabilities/etc. */
export default function FilterBar({ search, onSearchChange, searchPlaceholder = 'Search...', selects, right }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
      {onSearchChange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-base)',
            border: '1px solid var(--bg-border)',
            borderRadius: 4,
            padding: '6px 10px',
            minWidth: 220,
          }}
        >
          <Search size={13} color="var(--text-muted)" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.8125rem', width: '100%' }}
          />
        </div>
      )}
      {selects?.map((s) => (
        <select key={s.key} className="input-field" value={s.value} onChange={(e) => s.onChange(e.target.value)}>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <div style={{ flex: 1 }} />
      {right}
    </div>
  );
}
