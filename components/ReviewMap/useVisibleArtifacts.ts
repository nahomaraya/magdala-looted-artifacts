import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';

export function useVisibleArtifacts(artifacts: ArtifactCard[]) {
  const [showWeakLinkArtifacts, setShowWeakLinkArtifacts] = useState(false);

  const visibleArtifacts = useMemo(() => {
    if (showWeakLinkArtifacts) return artifacts;
    return artifacts.filter((a) => !a.weakLink && a.sourceLinks.length > 0);
  }, [artifacts, showWeakLinkArtifacts]);

  return { visibleArtifacts, showWeakLinkArtifacts, setShowWeakLinkArtifacts };
}
