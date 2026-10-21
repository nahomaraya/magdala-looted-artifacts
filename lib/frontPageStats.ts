import { isReturned } from '@/lib/repatriation';
import type { ArtifactCard } from '@/lib/types';

export interface KeyNumbers {
  artifacts: number;
  holders: number;
  returned: number;
  countries: number;
}

/** Front-page counts. Holders and countries span every card's `allHolders`; a holder without a QID is not counted. */
export function keyNumbers(cards: ArtifactCard[]): KeyNumbers {
  const holders = new Set<string>();
  const countries = new Set<string>();
  for (const card of cards) {
    for (const holder of card.allHolders) {
      if (holder.qid) holders.add(holder.qid);
      if (holder.country) countries.add(holder.country);
    }
  }
  return {
    artifacts: cards.length,
    holders: holders.size,
    returned: cards.filter(isReturned).length,
    countries: countries.size,
  };
}

/** Returned artifacts, most recent return first (ISO dates sort lexically), undated last. */
export function recentRepatriations(cards: ArtifactCard[], limit = 6): ArtifactCard[] {
  return cards
    .filter(isReturned)
    .sort((a, b) => {
      if (a.returnedDate && b.returnedDate) return b.returnedDate.localeCompare(a.returnedDate);
      if (a.returnedDate) return -1;
      if (b.returnedDate) return 1;
      return 0;
    })
    .slice(0, limit);
}
