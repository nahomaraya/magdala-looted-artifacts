import { useSyncExternalStore } from 'react';

export type LayoutMode = 'compact' | 'wide';

/** Tailwind's `lg` — the one boundary between the sheet layout and the columns. */
const WIDE_QUERY = '(min-width: 64rem)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): LayoutMode {
  return window.matchMedia(WIDE_QUERY).matches ? 'wide' : 'compact';
}

/** `null` on the server and during hydration, so nothing layout-specific runs early. */
function getServerSnapshot(): LayoutMode | null {
  return null;
}

export function useLayoutMode(): LayoutMode | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
