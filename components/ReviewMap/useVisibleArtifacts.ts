import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { isReturnedArtifact } from './reviewMapUtils';

export function useVisibleArtifacts(
  artifacts: ArtifactCard[],
  // A deep-linked artifact (e.g. ?wpId=… from the library) must stay visible
  // even when it's a weak link or has no source links, otherwise the nav hook
  // would reset the selection away from it on mount.
  alwaysIncludeWpId: string | null = null,
) {
  const [showWeakLinkArtifacts, setShowWeakLinkArtifacts] = useState(false);
  const [showReturnedOnly, setShowReturnedOnly] = useState(false);

  // How many artifacts have been repatriated — used to label/disable the
  // "returned to Ethiopia" toggle. Independent of the current filters.
  const returnedCount = useMemo(() => artifacts.filter(isReturnedArtifact).length, [artifacts]);

  const visibleArtifacts = useMemo(() => {
    // Returned-only is an exclusive mode: show every repatriated artifact
    // regardless of weak-link / source-link status (plus any deep-link target).
    if (showReturnedOnly) {
      return artifacts.filter((a) => isReturnedArtifact(a) || a.wpId === alwaysIncludeWpId);
    }
    if (showWeakLinkArtifacts) return artifacts;
    return artifacts.filter(
      (a) => a.wpId === alwaysIncludeWpId || (!a.weakLink && a.sourceLinks.length > 0),
    );
  }, [artifacts, showWeakLinkArtifacts, showReturnedOnly, alwaysIncludeWpId]);

  return {
    visibleArtifacts,
    showWeakLinkArtifacts,
    setShowWeakLinkArtifacts,
    showReturnedOnly,
    setShowReturnedOnly,
    returnedCount,
  };
}
