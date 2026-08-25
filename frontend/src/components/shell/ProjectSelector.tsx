import { useEffect, useRef } from 'react';
import { Layers, ChevronDown, Check } from 'lucide-react';
import { PROJECT_OPTIONS, setFilter, togglePopover, closePopover, useUiStore } from '../../lib/uiStore';
import { toast } from '../../lib/toastStore';

/**
 * "Demo / All Projects ▾" control in the header's left cluster (matches the
 * reference screenshot's project/workspace selector). Backed by the same
 * `filters.environment` state that Security/Financial dashboards already
 * read — selecting a project genuinely changes application state, it is
 * not decorative.
 */
export default function ProjectSelector() {
  const openPopover = useUiStore((s) => s.openPopover);
  const environment = useUiStore((s) => s.filters.environment);
  const open = openPopover === 'project';
  const ref = useRef<HTMLDivElement>(null);
  const current = PROJECT_OPTIONS.find((p) => p.id === environment) ?? PROJECT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closePopover();
    };
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closePopover();
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const select = (id: typeof environment) => {
    setFilter('environment', id);
    closePopover();
    const p = PROJECT_OPTIONS.find((o) => o.id === id);
    if (p) toast.info('Project scope changed', `Dashboards now scoped to ${p.name}.`);
  };

  return (
    <div className="topbar-project" ref={ref}>
      <button
        type="button"
        className="topbar-project-trigger"
        onClick={() => togglePopover('project')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Layers size={14} />
        <span>{current.name}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="topbar-dropdown" role="listbox">
          {PROJECT_OPTIONS.map((p) => (
            <button
              key={p.id}
              role="option"
              aria-selected={p.id === environment}
              className={`topbar-dropdown-option${p.id === environment ? ' selected' : ''}`}
              onClick={() => select(p.id)}
            >
              <span>{p.name}</span>
              {p.id === environment && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
