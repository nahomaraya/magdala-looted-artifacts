import type { ArtifactCard } from '@/lib/types';

export type MuseumGroup = {
  key: string;
  name: string;
  qid: string | null;
  count: number;
};

export type ReviewStatus = 'already' | 'fuzzy' | 'new';

export function getReviewStatus(card: ArtifactCard): ReviewStatus {
  if (card.dedup.method === 'p973' && card.dedup.qid) return 'already';
  if (card.dedup.method === 'fuzzy' && card.dedup.qid) return 'fuzzy';
  return 'new';
}

export const UNKNOWN_HOLDER = 'Unknown / Unresolved';

export { isReturned as isReturnedArtifact } from '@/lib/repatriation';

export interface ReviewWikidataHit {
  qid: string;
  label: string;
  imageUrl?: string;
  wikidataUrl: string;
}

