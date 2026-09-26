import { useEffect, useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import type { MuseumGroup } from './reviewMapUtils';
import { UNKNOWN_HOLDER, holderFocusCoords } from './reviewMapUtils';

export function useMuseumFilter(visibleArtifacts: ArtifactCard[]) {
  const [selectedMuseum, setSelectedMuseum] = useState<string | null>(null);

  const museumGroups = useMemo<MuseumGroup[]>(() => {
    const groups = new Map<string, MuseumGroup>();
    for (const card of visibleArtifacts) {
      const name = card.holder?.name ?? UNKNOWN_HOLDER;
      const existing = groups.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(name, { key: name, name, qid: card.holder?.qid ?? null, count: 1 });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [visibleArtifacts]);

  const filteredArtifacts = useMemo(() => {
    if (!selectedMuseum) return visibleArtifacts;
    return visibleArtifacts.filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === selectedMuseum);
  }, [selectedMuseum, visibleArtifacts]);

  const focusedCoords = useMemo<[number, number] | null>(() => {
    if (!selectedMuseum) return null;
    return holderFocusCoords(filteredArtifacts);
  }, [selectedMuseum, filteredArtifacts]);

  useEffect(() => {
    if (selectedMuseum && !museumGroups.some((g) => g.key === selectedMuseum)) {
      setSelectedMuseum(null);
    }
  }, [museumGroups, selectedMuseum]);

  return { selectedMuseum, setSelectedMuseum, museumGroups, filteredArtifacts, focusedCoords };
}
