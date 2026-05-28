import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import type { ReviewWikidataHit, MuseumGroup } from './reviewMapUtils';
import { UNKNOWN_HOLDER } from './reviewMapUtils';

export function useReviewMapState(artifacts: ArtifactCard[], wikidataHits: Record<string, ReviewWikidataHit>) {
  const [selectedWpId, setSelectedWpId] = useState<string | null>(artifacts[0]?.wpId ?? null);
  const [selectedMuseum, setSelectedMuseum] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const museumGroups = useMemo<MuseumGroup[]>(() => {
    const groups = new Map<string, MuseumGroup>();
    for (const card of artifacts) {
      const name = card.holder?.name ?? UNKNOWN_HOLDER;
      const existing = groups.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(name, { key: name, name, qid: card.holder?.qid ?? null, count: 1 });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [artifacts]);

  const filteredArtifacts = useMemo(() => {
    if (!selectedMuseum) return artifacts;
    return artifacts.filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === selectedMuseum);
  }, [artifacts, selectedMuseum]);

  const focusedCoords = useMemo<[number, number] | null>(() => {
    if (!selectedMuseum) return null;
    const withCoords = filteredArtifacts.find((a) => a.holder?.coords);
    return withCoords?.holder?.coords ?? null;
  }, [selectedMuseum, filteredArtifacts]);

  const selected = filteredArtifacts.find((a) => a.wpId === selectedWpId) ?? null;
  const selectedIndex = useMemo(() => filteredArtifacts.findIndex((a) => a.wpId === selectedWpId), [filteredArtifacts, selectedWpId]);

  const handleSelectMuseum = (name: string | null) => {
    setSelectedMuseum(name);
    const nextList = name ? artifacts.filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === name) : artifacts;
    setSelectedWpId(nextList[0]?.wpId ?? null);
  };

  const handleNextArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const nextIndex = selectedIndex < 0 ? 0 : (selectedIndex + 1) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[nextIndex]?.wpId ?? null);
    setMobileDetailsOpen(true);
    setMobileMenuOpen(false);
  };

  const handlePreviousArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const previousIndex = selectedIndex < 0 ? 0 : (selectedIndex - 1 + filteredArtifacts.length) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[previousIndex]?.wpId ?? null);
    setMobileDetailsOpen(true);
    setMobileMenuOpen(false);
  };

  const primarySource = selected?.sourceLinks[0] ?? selected?.url ?? null;

  const selectedWikidata = selected?.dedup.method === 'p973' && selected.dedup.qid ? wikidataHits[selected.dedup.qid] : null;
  const previewImage = selectedWikidata?.imageUrl ?? selected?.imageUrls[0];
  const previewTitle = selectedWikidata?.label ?? selected?.title;
  const takenFromLabel = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';
  const currentLocationLabel = selected?.where ?? selected?.holder?.name ?? 'Unknown';
  const responsibleLabel = selected?.holder?.name && selected.holder.name !== UNKNOWN_HOLDER ? selected.holder.name : null;

  return {
    selectedWpId,
    setSelectedWpId,
    selectedMuseum,
    setSelectedMuseum,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileDetailsOpen,
    setMobileDetailsOpen,
    museumGroups,
    filteredArtifacts,
    focusedCoords,
    selected,
    selectedIndex,
    handleSelectMuseum,
    handleNextArtifact,
    handlePreviousArtifact,
    primarySource,
    previewImage,
    previewTitle,
    takenFromLabel,
    currentLocationLabel,
    responsibleLabel,
  } as const;
}
