'use client';
import Image from 'next/image';
import type { ArtifactCard } from '@/lib/types';

export default function ArtifactHeader({
  selected,
  previewTitle,
  selectedIndex,
  filteredArtifacts,
  selectedMuseum,
  previewImage,
}: {
  selected: ArtifactCard;
  previewTitle?: string | null;
  selectedIndex: number;
  filteredArtifacts: ArtifactCard[];
  selectedMuseum: string | null;
  previewImage?: string | undefined;
}) {
  return (
    <>
      <div className="rounded border border-navy-border/70 bg-navy/70 px-5 py-5 space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-parchment-dim">Artifact title</p>
        <h1 className="font-heading text-4xl text-parchment leading-tight">
          {previewTitle ?? selected.title}
        </h1>
        <p className="text-base text-parchment-dim">
          WP #{selected.wpId} · {selectedIndex + 1} / {filteredArtifacts.length}
          {selectedMuseum && <span className="ml-1 opacity-70">in {selectedMuseum}</span>}
        </p>
      </div>

      {previewImage && previewTitle && (
        <div className="relative h-64 rounded border border-navy-border overflow-hidden bg-navy">
          <Image src={previewImage} alt={previewTitle} fill className="object-contain" unoptimized />
        </div>
      )}
    </>
  );
}
