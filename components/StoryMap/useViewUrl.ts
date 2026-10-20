'use client';

import { useEffect } from 'react';
import { mapHref, type ViewId } from './views';

/** Keeps the address bar on the current View and selection without a navigation. */
export function useViewUrl(view: ViewId, qid: string | null): void {
  useEffect(() => {
    window.history.replaceState(null, '', mapHref(view, qid));
  }, [view, qid]);
}
