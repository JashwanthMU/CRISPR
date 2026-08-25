import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  collapsed: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

/**
 * A collapsible navigation section ("OVERVIEW", "INVESTIGATE", ...). In
 * collapsed-rail mode the section header is hidden entirely (icons render
 * in one continuous column, exactly like the Wiz reference rail) — the
 * expand/collapse behavior only applies once the sidebar itself is expanded.
 */
export default function SidebarGroup({ id, title, collapsed, expanded, onToggle, children }: Props) {
  if (collapsed) {
    return <div className="sidebar-group-collapsed">{children}</div>;
  }

  return (
    <div className="sidebar-group">
      <button
        type="button"
        className="sidebar-group-header"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        aria-controls={`sidebar-group-${id}`}
      >
        <span>{title}</span>
        <ChevronDown size={13} className={`sidebar-group-chevron${expanded ? ' expanded' : ''}`} />
      </button>
      <div id={`sidebar-group-${id}`} className={`sidebar-group-body${expanded ? ' expanded' : ''}`}>
        <div className="sidebar-group-body-inner">{children}</div>
      </div>
    </div>
  );
}
