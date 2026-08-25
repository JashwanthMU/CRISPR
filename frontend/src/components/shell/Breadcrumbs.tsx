import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BRAND } from '../../config/branding';
import { PAGE_LABELS } from './navConfig';

const EXTRA_LABELS: Record<string, string> = {
  'code-security': 'Code Security',
  repositories: 'Repository',
  sca: 'SCA & SBOM',
  demo: 'Developer Workspace',
  vscode: 'Developer Workspace',
};

interface Crumb {
  label: string;
  path: string | null; // null = current page, not clickable
}

/**
 * Real breadcrumb trail derived from the current route — updates on every
 * navigation because it reads useLocation(). Every non-final segment is a
 * genuine, clickable link back to that path.
 */
export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();

  const crumbs: Crumb[] = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Security Dashboard', path: null }];

    const out: Crumb[] = [];
    let acc = '';
    segments.forEach((seg, i) => {
      acc += `/${seg}`;
      const isLast = i === segments.length - 1;
      const isRawId = /^[A-Za-z0-9_-]{6,}$/.test(seg) && !PAGE_LABELS[seg] && !EXTRA_LABELS[seg];
      const label = PAGE_LABELS[seg] ?? EXTRA_LABELS[seg] ?? (isRawId ? seg : seg.replace(/-/g, ' '));
      out.push({ label, path: isLast ? null : acc });
    });
    return out;
  }, [location.pathname]);

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <button type="button" className="breadcrumb-root" onClick={() => navigate('/security')}>
        {BRAND.name}
      </button>
      {crumbs.map((c, i) => (
        <span key={i} className="breadcrumb-segment">
          <ChevronRight size={13} className="sep" aria-hidden="true" />
          {c.path ? (
            <button type="button" className="breadcrumb-link" onClick={() => navigate(c.path!)}>
              {c.label}
            </button>
          ) : (
            <span className="breadcrumb-current" aria-current="page" style={{ textTransform: 'capitalize' }}>
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
