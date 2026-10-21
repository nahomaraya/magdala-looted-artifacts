import Image from 'next/image';
import Link from 'next/link';
import { type CommonsImage, fileTitleFromFilePath } from '@/lib/commonsImages';
import type { FeaturedArtifact } from '@/lib/featured';
import { FOCUS_RING } from './focus';

const MAX_TILES = 12;

interface Tile {
  src: string;
  /** Credit-line entry; every tile has one. */
  credit: CommonsImage;
}

/** "File:Fortress of Magdala.jpg" → "Fortress of Magdala". */
function fileLabel(title: string): string {
  return title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
}

/**
 * Sepia collage of up to 12 photographs — featured artifact images first, then
 * Commons hero images — behind the page title. A featured image is used only
 * once its Commons credit (free licence) is known. Without Commons it is plain
 * navy. Tiles are decorative; the credits line names every photograph.
 */
export default function HeroCollage({
  featured,
  heroImages,
  credits,
}: {
  featured: FeaturedArtifact[];
  heroImages: CommonsImage[];
  /** Featured image credits keyed by Commons file title (see getFileCredits). */
  credits: Map<string, CommonsImage>;
}) {
  const tiles: Tile[] = [];
  const used = new Set<string>();
  const add = (src: string, credit: CommonsImage) => {
    if (tiles.length >= MAX_TILES || used.has(credit.title)) return;
    used.add(credit.title);
    tiles.push({ src, credit });
  };
  for (const f of featured) {
    const title = f.image ? fileTitleFromFilePath(f.image) : null;
    const credit = title ? credits.get(title) : undefined;
    if (f.image && credit) add(f.image, credit);
  }
  for (const img of heroImages) add(img.thumbUrl, img);

  return (
    <section aria-labelledby="front-title">
      <div className="relative overflow-hidden rounded border border-navy-border bg-navy-light">
        {tiles.length > 0 && (
          <div className="absolute inset-0 grid grid-cols-3 gap-1 sm:grid-cols-4">
            {tiles.map((tile) => (
              <div key={tile.credit.title} className="relative overflow-hidden">
                <Image
                  src={tile.src}
                  alt=""
                  fill
                  loading="eager"
                  sizes="(min-width: 640px) 25vw, 33vw"
                  className="object-cover brightness-90 sepia"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-navy via-navy/80 to-navy/40" />
        <div className="relative flex min-h-112 flex-col items-start justify-end gap-4 p-6 sm:min-h-128 sm:p-10">
          <h1 id="front-title" className="font-heading text-4xl text-parchment sm:text-6xl">
            Looted from Maqdala
          </h1>
          <p className="max-w-xl text-lg text-parchment sm:text-xl">
            Objects taken after the Battle of Magdala in 1868, and where they are held today.
          </p>
          <Link
            href="/map"
            className={`rounded bg-gold px-5 py-2.5 font-semibold text-navy hover:bg-gold-dim ${FOCUS_RING}`}
          >
            Explore the map
          </Link>
        </div>
      </div>

      {tiles.length > 0 && (
        <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
          Photographs from Wikimedia Commons:{' '}
          {tiles.map(({ credit: img }, i) => (
            <span key={img.title}>
              {i > 0 && '; '}
              <a
                href={img.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`wrap-break-word underline hover:text-gold ${FOCUS_RING}`}
              >
                {fileLabel(img.title)}
              </a>
              {` — ${img.artist}, ${img.license}`}
            </span>
          ))}
          .
        </p>
      )}
    </section>
  );
}
