import { useCallback, useEffect, useRef } from 'react';
import { setSidebarWidth, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from '../../lib/uiStore';

interface Props {
  currentWidth: number;
}

/**
 * Drag handle on the sidebar's right edge. Only rendered when the sidebar
 * is expanded (resizing a 72px icon rail makes no sense). Width is clamped
 * to [SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH] and persisted via setSidebarWidth
 * (localStorage), matching the spec's "drag sidebar width, min 72 / max 320,
 * persist" requirement — kept as an *additive* resize on top of the primary
 * collapse/expand interaction rather than a replacement for it, since the
 * spec explicitly allows falling back to collapse/expand as the core
 * interaction if resizing proves unstable; here both co-exist safely because
 * resizing only ever adjusts the expanded-state width.
 */
export default function SidebarResizer({ currentWidth }: Props) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(currentWidth);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - startXRef.current;
    setSidebarWidth(startWidthRef.current + delta);
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Keyboard resize: focus the handle, use Left/Right arrows.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth(currentWidth - 8);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth(currentWidth + 8);
    }
  };

  useEffect(() => () => onPointerUp(), [onPointerUp]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={currentWidth}
      aria-label="Resize sidebar"
      tabIndex={0}
      className="sidebar-resizer"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
