import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query from JS.
 *
 * Needed where a layout decision must also change behaviour, not just styling —
 * the sidebar is permanently visible at `lg`, so it must not be marked inert
 * there even though its mobile drawer state is closed.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches Tailwind's `lg` breakpoint, where the sidebar becomes permanent. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
