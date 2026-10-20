'use client';
import Image from 'next/image';
import type { ArtifactCard } from '@/lib/types';
import type { Presentation } from './presentation';
import ImagePlaceholder from './ImagePlaceholder';

export default function ArtifactHeader({
  selected,
  presentation,
  position,
}: {
  selected: ArtifactCard;
  presentation: Presentation;
  position: { index: number; count: number; holder: string | null };
}) {
  return (
    <>
      <div className="rounded border border-navy-border/70 bg-navy/70 px-5 py-5 space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-parchment-dim">Artifact title</p>
        <h1 className="font-heading text-4xl text-parchment leading-tight">
          {presentation.title}
        </h1>
        <p className="text-base text-parchment-dim">
          <a
            href={presentation.wikidataUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            {selected.wpId}
          </a>{' '}
          · {position.index + 1} / {position.count}
          {position.holder && <span className="ml-1 opacity-70">in {position.holder}</span>}
        </p>
      </div>

      {presentation.image ? (
        <div className="relative h-64 rounded border border-navy-border overflow-hidden bg-navy">
          <Image src={presentation.image} alt={presentation.title} fill className="object-contain" unoptimized />
        </div>
      ) : (
        <ImagePlaceholder qid={selected.wpId} />
      )}
    </>
  );
}
