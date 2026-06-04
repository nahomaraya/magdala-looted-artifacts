import type { ArtifactCard } from '@/lib/types';
import { getReviewStatus } from '../ReviewMap/reviewMapUtils';

export default function DedupBadge({ card }: { card: ArtifactCard }) {
  const status = getReviewStatus(card);
  if (status === 'already' && card.dedup.qid) {
    return (
      <span className="inline-flex items-center rounded border border-gray-300/40 bg-gray-500/10 px-2 py-1 text-xs text-gray-300">
        already in Wikidata: {card.dedup.qid}
      </span>
    );
  }
  return null;
}
