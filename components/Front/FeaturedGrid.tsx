import Image from 'next/image';
import Link from 'next/link';
import ImagePlaceholder from '@/components/Artifact/ImagePlaceholder';
import { mapHref } from '@/components/StoryMap/views';
import type { FeaturedArtifact } from '@/lib/featured';
import { FOCUS_RING } from './focus';

/** Featured artifact cards, each opening the artifact on the map. Omitted when there are none. */
export default function FeaturedGrid({ featured }: { featured: FeaturedArtifact[] }) {
  if (featured.length === 0) return null;
  return (
    <section aria-labelledby="featured-title">
      <h2 id="featured-title" className="mb-4 font-heading text-3xl text-parchment">
        Featured artifacts
      </h2>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map(({ card, image, pinText }) => (
          <li key={card.wpId} className="flex flex-col overflow-hidden rounded border border-navy-border bg-navy-light">
            {image ? (
              <div className="relative h-56 bg-navy">
                <Image
                  src={image}
                  alt={card.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <ImagePlaceholder qid={card.wpId} className="h-56" />
            )}
            <div className="flex flex-1 flex-col gap-1 p-4">
              <h3 className="font-heading text-xl">
                <Link href={mapHref('map', card.wpId)} className={`text-parchment hover:text-gold ${FOCUS_RING}`}>
                  {card.title}
                </Link>
              </h3>
              {card.holder && <p className="text-base text-parchment-dim">{card.holder.name}</p>}
              {pinText && <p className="mt-2 text-base text-parchment">{pinText}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
