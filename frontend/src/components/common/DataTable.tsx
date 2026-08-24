import { ReactNode, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Rows3, Rows2 } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string;
}

interface Props<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  pageSize?: number;
  emptyLabel?: string;
  defaultSortKey?: string;
  bulkActions?: (selectedIds: string[]) => ReactNode;
}

/**
 * Shared enterprise data table: sortable headers, pagination, row selection
 * with bulk actions, density control, and hover states. Used by Findings,
 * Assets, Risk Cases, Vulnerabilities, Secrets, Code Issues, SCA, Remediation
 * Queue, Repositories, and Integrations tables so behavior stays consistent
 * everywhere instead of being re-implemented (and half-wired) per page.
 */
export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
  pageSize = 10,
  emptyLabel = 'No records match the current filters.',
  defaultSortKey,
  bulkActions,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = sortedRows.slice(page * pageSize, page * pageSize + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const allOnPageSelected = selectable && pageRows.length > 0 && pageRows.every((r) => selected?.has(getRowId(r)));

  const toggleAll = () => {
    if (!onSelectedChange || !selected) return;
    const next = new Set(selected);
    if (allOnPageSelected) {
      pageRows.forEach((r) => next.delete(getRowId(r)));
    } else {
      pageRows.forEach((r) => next.add(getRowId(r)));
    }
    onSelectedChange(next);
  };

  const toggleRow = (id: string) => {
    if (!onSelectedChange || !selected) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {sortedRows.length} record{sortedRows.length === 1 ? '' : 's'}
          {selectable && selected && selected.size > 0 && <span> · {selected.size} selected</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {selectable && selected && selected.size > 0 && bulkActions?.(Array.from(selected))}
          <button
            className="icon-btn"
            title={density === 'comfortable' ? 'Compact rows' : 'Comfortable rows'}
            onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
          >
            {density === 'comfortable' ? <Rows3 size={14} /> : <Rows2 size={14} />}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={`data-table density-${density}`}>
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={!!allOnPageSelected} onChange={toggleAll} aria-label="Select all rows on page" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, cursor: col.sortValue ? 'pointer' : undefined, userSelect: 'none' }}
                  onClick={() => col.sortValue && toggleSort(col.key)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortValue && sortKey === col.key && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const id = getRowId(row);
              const isSelected = selectable && !!selected?.has(id);
              return (
                <tr
                  key={id}
                  className={isSelected ? 'selected' : undefined}
                  aria-selected={selectable ? isSelected : undefined}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={!!selected?.has(id)} onChange={() => toggleRow(id)} aria-label={`Select row ${id}`} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="empty-state">{emptyLabel}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="icon-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            <button
              className="icon-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
