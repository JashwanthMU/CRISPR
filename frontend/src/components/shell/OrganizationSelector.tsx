import { useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { ORG_OPTIONS, setSelectedOrg, togglePopover, closePopover, useUiStore } from '../../lib/uiStore';
import { toast } from '../../lib/toastStore';

interface Props {
  collapsed: boolean;
}

/**
 * "Organization" selector shown beneath the brand header. Real, stateful
 * dropdown backed by useUiStore.selectedOrgId (persisted to localStorage) —
 * selecting an option genuinely updates application state and is reflected
 * immediately in the trigger label, not a static display.
 */
export default function OrganizationSelector({ collapsed }: Props) {
  const openPopover = useUiStore((s) => s.openPopover);
  const selectedOrgId = useUiStore((s) => s.selectedOrgId);
  const open = openPopover === 'org';
  const ref = useRef<HTMLDivElement>(null);
  const current = ORG_OPTIONS.find((o) => o.id === selectedOrgId) ?? ORG_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closePopover();
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopover();
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const select = (id: string) => {
    setSelectedOrg(id);
    closePopover();
    const org = ORG_OPTIONS.find((o) => o.id === id);
    if (org) toast.info('Organization switched', org.name);
  };

  return (
    <div className="sidebar-org" ref={ref}>
      <button
        type="button"
        className="sidebar-org-trigger"
        onClick={() => togglePopover('org')}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={collapsed ? current.name : undefined}
      >
        <Building2 size={16} className="sidebar-org-icon" />
        {!collapsed && (
          <span className="sidebar-org-text">
            <span className="sidebar-org-label">Organization</span>
            <span className="sidebar-org-name" title={current.name}>
              {current.name}
            </span>
          </span>
        )}
        {!collapsed && <ChevronDown size={14} className="sidebar-org-chevron" />}
        {collapsed && (
          <span className="nav-tooltip" role="tooltip">
            {current.name}
          </span>
        )}
      </button>
      {open && (
        <div className="sidebar-org-dropdown" role="listbox">
          {ORG_OPTIONS.map((o) => (
            <button
              key={o.id}
              role="option"
              aria-selected={o.id === selectedOrgId}
              className={`sidebar-org-option${o.id === selectedOrgId ? ' selected' : ''}`}
              onClick={() => select(o.id)}
            >
              <span>{o.name}</span>
              {o.id === selectedOrgId && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
