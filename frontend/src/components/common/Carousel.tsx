import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  children: ReactNode[];
  /** Auto-advance interval in ms. Omit/0 to disable auto-advance. */
  autoAdvanceMs?: number;
  ariaLabel?: string;
}

/**
 * Horizontal content carousel (CSS scroll-snap based — no new dependency).
 * Supports manual prev/next, pagination dots, pause-on-hover, keyboard
 * arrow navigation, and optional auto-advance. Used for "Security Insights"
 * and similar selective horizontal sections — NOT the whole dashboard.
 */
export default function Carousel({ children, autoAdvanceMs = 0, ariaLabel = 'Carousel' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = children.length;

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(count - 1, index));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
    }
    setActive(clamped);
  }, [count]);

  const goNext = useCallback(() => scrollToIndex((active + 1) % count), [active, count, scrollToIndex]);
  const goPrev = useCallback(() => scrollToIndex((active - 1 + count) % count), [active, count, scrollToIndex]);

  // Auto-advance
  useEffect(() => {
    if (!autoAdvanceMs || paused || count <= 1) return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const timer = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % count;
        scrollToIndex(next);
        return next;
      });
    }, autoAdvanceMs);
    return () => clearInterval(timer);
  }, [autoAdvanceMs, paused, count, scrollToIndex]);

  // Track manual scroll to keep pagination dots in sync
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const children = Array.from(track.children) as HTMLElement[];
        let closest = 0;
        let closestDist = Infinity;
        children.forEach((child, i) => {
          const dist = Math.abs(child.offsetLeft - track.offsetLeft - track.scrollLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActive(closest);
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="carousel"
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goNext();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goPrev();
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 8 }}>
        <button className="icon-btn" style={{ border: '1px solid var(--color-border)' }} onClick={goPrev} aria-label="Previous slide">
          <ChevronLeft size={15} />
        </button>
        <button className="icon-btn" style={{ border: '1px solid var(--color-border)' }} onClick={goNext} aria-label="Next slide">
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="carousel-track" ref={trackRef} tabIndex={0}>
        {children.map((child, i) => (
          <div className="carousel-slide" key={i} aria-hidden={active !== i}>
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="carousel-dots" role="tablist" aria-label={`${ariaLabel} pagination`}>
          {children.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={active === i}
              aria-label={`Go to slide ${i + 1}`}
              className={`carousel-dot${active === i ? ' active' : ''}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
