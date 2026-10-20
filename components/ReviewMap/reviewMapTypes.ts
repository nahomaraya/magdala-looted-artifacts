import type { ArtifactCard } from '@/lib/types';

/** 'fuzzy' removed: dedup is skipped on every live call path, so a card can
 *  never carry that method. See docs/review-session-deepening.md §2. */
export type ReviewStatus = 'already' | 'new';

export function getReviewStatus(card: ArtifactCard): ReviewStatus {
  if (card.dedup.method === 'p973' && card.dedup.qid) return 'already';
  return 'new';
}

export interface ReviewWikidataHit {
  qid: string;
  label: string;
  imageUrl?: string;
  wikidataUrl: string;
}
