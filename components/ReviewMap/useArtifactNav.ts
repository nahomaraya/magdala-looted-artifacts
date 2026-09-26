import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { reconcileSelection, stepIndex } from './selection';
import type { LayoutMode } from './useLayoutMode';

export function useArtifactNav(
  filteredArtifacts: ArtifactCard[],
  initialSelectedWpId: string | null = null,
  mode: LayoutMode | null = null,
) {
  // What the reader last picked. The effective selection is derived from it
  // each render, so a filter change can't leave a stale selection behind.
  const [chosenWpId, setSelectedWpId] = useState<string | null>(initialSelectedWpId);

  const wpIds = useMemo(() => filteredArtifacts.map((a) => a.wpId), [filteredArtifacts]);
  const selectedWpId = reconcileSelection(wpIds, chosenWpId, mode);
  const selectedIndex = selectedWpId ? wpIds.indexOf(selectedWpId) : -1;

  const stepArtifact = (dir: 1 | -1): string | null => {
    if (wpIds.length === 0) return null;
    const next = wpIds[stepIndex(wpIds.length, selectedIndex, dir)] ?? null;
    setSelectedWpId(next);
    return next;
  };

  return {
    selectedWpId,
    setSelectedWpId,
    selectedIndex,
    stepArtifact,
    handleNextArtifact: () => { stepArtifact(1); },
    handlePreviousArtifact: () => { stepArtifact(-1); },
  };
}
