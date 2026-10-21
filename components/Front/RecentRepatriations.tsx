import Link from 'next/link';
import { mapHref } from '@/components/StoryMap/views';
import type { ArtifactCard } from '@/lib/types';
import { FOCUS_RING } from './focus';

/** Horizontal strip of the most recently returned artifacts. Omitted when none are returned. */
export default function RecentRepatriations({ cards }: { cards: ArtifactCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="repatriations-title">
      <h2 id="repatriations-title" className="mb-4 font-heading text-3xl text-parchment">
        Recent repatriations
      </h2>
      <ul className="flex snap-x gap-4 overflow-x-auto pb-2">
        {cards.map((card) => (
          <li key={card.wpId} className="w-64 shrink-0 snap-start">
            <Link
              href={mapHref('map', card.wpId)}
              className={`flex h-full flex-col gap-1 rounded border border-navy-border bg-navy-light p-4 hover:border-gold ${FOCUS_RING}`}
            >
              <span className="font-heading text-lg text-parchment">{card.title}</span>
              <span className="text-base text-location">
                {card.returnedDate ? `Returned ${card.returnedDate.slice(0, 4)}` : 'Returned'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
