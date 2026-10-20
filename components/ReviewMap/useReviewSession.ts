'use client';

import { useMemo, useReducer } from 'react';
import type { ArtifactCard } from '@/lib/types';
import {
  derive,
  initSession,
  reduce,
  type SessionAction,
  type SessionState,
  type SessionView,
} from './reviewSession';

/**
 * Thin React binding over the pure reviewSession module. Deliberately holds no
 * logic of its own: everything worth testing lives in reviewSession.ts.
 */
export function useReviewSession(artifacts: ArtifactCard[], pinnedWpId: string | null) {
  const [state, dispatch] = useReducer(
    (s: SessionState, a: SessionAction) => reduce(s, a, artifacts, pinnedWpId),
    null,
    () => initSession(artifacts, pinnedWpId),
  );

  const view: SessionView = useMemo(
    () => derive(state, artifacts, pinnedWpId),
    [state, artifacts, pinnedWpId],
  );

  return [view, dispatch] as const;
}
