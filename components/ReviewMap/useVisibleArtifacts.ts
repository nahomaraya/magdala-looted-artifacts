import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';

export function useVisibleArtifacts(
  artifacts: ArtifactCard[],
  // A deep-linked artifact (e.g. ?wpId=… from the library) must stay visible
  // even when it's a weak link or has no source links, otherwise the nav hook
  // would reset the selection away from it on mount.
  alwaysIncludeWpId: string | null = null,
) {
  const [showWeakLinkArtifacts, setShowWeakLinkArtifacts] = useState(false);

  const visibleArtifacts = useMemo(() => {
    if (showWeakLinkArtifacts) return artifacts;
    return artifacts.filter(
      (a) => a.wpId === alwaysIncludeWpId || (!a.weakLink && a.sourceLinks.length > 0),
    );
  }, [artifacts, showWeakLinkArtifacts, alwaysIncludeWpId]);

  return { visibleArtifacts, showWeakLinkArtifacts, setShowWeakLinkArtifacts };
}
