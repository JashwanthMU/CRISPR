import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, SlidersHorizontal, Building2, KeyRound, HelpCircle, LogOut } from 'lucide-react';
import { useUiStore, togglePopover, closePopover } from '../../lib/uiStore';
import { toast } from '../../lib/toastStore';
import { clearSession, getSession } from '../../lib/auth';

const MENU_ITEMS = [
  { label: 'Profile', icon: User, path: '/settings' },
  { label: 'Preferences', icon: SlidersHorizontal, path: '/settings' },
  { label: 'Organization', icon: Building2, path: '/settings' },
  { label: 'API Keys', icon: KeyRound, path: '/api-reference' },
  { label: 'Help', icon: HelpCircle, path: null },
] as const;

/** User avatar + account dropdown. Escape and outside-click both close it. */
export default function UserMenu() {
  const openPopover = useUiStore((s) => s.openPopover);
  const open = openPopover === 'profile';
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = getSession()?.user;

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

  const go = (path: string | null, label: string) => {
    closePopover();
    if (path) navigate(path);
    else toast.info('CRISPR Docs', 'Documentation portal would open in a new tab.');
    if (!path && label !== 'Help') toast.info(label);
  };

  const signOut = () => {
    closePopover();
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="topbar-popover-wrap" ref={ref}>
      <button
        type="button"
        className="avatar-circle"
        onClick={() => togglePopover('profile')}
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {(user?.name || 'ST').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
      </button>
      {open && (
        <div className="topbar-dropdown-panel user-menu-panel" role="menu" aria-label="User menu">
          <div className="user-menu-header">
            <div className="user-menu-name">{user?.name || 'Security Team'}</div>
            <div className="user-menu-role">{user?.email}</div>
          </div>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} role="menuitem" className="user-menu-item" onClick={() => go(item.path, item.label)}>
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="sidebar-divider" style={{ margin: '4px 0' }} />
          <button role="menuitem" className="user-menu-item danger" onClick={signOut}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
