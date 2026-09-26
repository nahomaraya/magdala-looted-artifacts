import type { ArtifactCard } from '@/lib/types';
import type { ReviewWikidataHit } from './reviewMapUtils';
import { UNKNOWN_HOLDER } from './reviewMapUtils';
import { useVisibleArtifacts } from './useVisibleArtifacts';
import { useMuseumFilter } from './useMuseumFilter';
import { useArtifactNav } from './useArtifactNav';
import type { LayoutMode } from './useLayoutMode';

export function useReviewMapState(
  artifacts: ArtifactCard[],
  wikidataHits: Record<string, ReviewWikidataHit>,
  initialSelectedWpId: string | null = null,
  mode: LayoutMode | null = null,
) {
  const {
    visibleArtifacts,
    showWeakLinkArtifacts,
    setShowWeakLinkArtifacts,
    showReturnedOnly,
    setShowReturnedOnly,
    returnedCount,
  } = useVisibleArtifacts(artifacts, initialSelectedWpId);
  const { selectedMuseum, setSelectedMuseum, museumGroups, filteredArtifacts, focusedCoords } =
    useMuseumFilter(visibleArtifacts);
  const nav = useArtifactNav(filteredArtifacts, initialSelectedWpId, mode);

  const handleSelectMuseum = (name: string | null) => {
    setSelectedMuseum(name);
    const nextList = name
      ? visibleArtifacts.filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === name)
      : visibleArtifacts;
    nav.setSelectedWpId(nextList[0]?.wpId ?? null);
  };

  const selected = filteredArtifacts.find((a) => a.wpId === nav.selectedWpId) ?? null;
  const primarySource = selected?.sourceLinks[0] ?? selected?.url ?? null;

  const selectedWikidata =
    selected?.dedup.method === 'p973' && selected.dedup.qid ? wikidataHits[selected.dedup.qid] : null;
  const wikidataUrl =
    selectedWikidata?.wikidataUrl ??
    (selected?.dedup.qid ? `https://www.wikidata.org/wiki/${selected.dedup.qid}` : null);
  const previewImage = selectedWikidata?.imageUrl ?? selected?.imageUrls[0];
  const previewTitle = selectedWikidata?.label ?? selected?.title;
  const takenFromLabel = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';
  const currentLocationLabel = selected?.where ?? selected?.holder?.name ?? 'Unknown';
  const responsibleLabel =
    selected?.holder?.name && selected.holder.name !== UNKNOWN_HOLDER ? selected.holder.name : null;

  return {
    ...nav,
    selectedMuseum,
    setSelectedMuseum,
    museumGroups,
    visibleArtifacts,
    filteredArtifacts,
    focusedCoords,
    showWeakLinkArtifacts,
    setShowWeakLinkArtifacts,
    showReturnedOnly,
    setShowReturnedOnly,
    returnedCount,
    selected,
    handleSelectMuseum,
    primarySource,
    wikidataUrl,
    previewImage,
    previewTitle,
    takenFromLabel,
    currentLocationLabel,
    responsibleLabel,
  } as const;
}
