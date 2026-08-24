import type { KeyboardEvent } from 'react';

/**
 * Attach to onKeyDown for any element using role="button" on a non-native
 * button (e.g. a clickable <div> card/row) so Enter and Space activate it,
 * matching native <button> keyboard behavior.
 */
export function activateOnEnter<T = Element>(handler: () => void) {
  return (e: KeyboardEvent<T>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}
