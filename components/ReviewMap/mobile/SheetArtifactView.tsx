'use client';
import { useRef } from 'react';
import Image from 'next/image';
import type { ArtifactCard } from '@/lib/types';
import ProvenanceSummary from '../../Artifact/ProvenanceSummary';
import { classifySwipe } from '../sheetGeometry';

export default function SheetArtifactView({
  selected,
  previewTitle,
  previewImage,
  wikidataUrl,
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
  onStep,
}: {
  selected: ArtifactCard | null;
  previewTitle: string | null;
  previewImage: string | undefined;
  wikidataUrl: string | null;
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
  onStep: (dir: 1 | -1) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  if (!selected) {
    return <p className="px-4 py-6 text-sm text-parchment-dim">This artifact is not in the current view.</p>;
  }

  const title = previewTitle ?? selected.title;
  const primarySourceUrl = selected.sourceLinks[0] ?? null;
  const linkClass =
    'rounded border border-blue-300/60 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 active:bg-blue-500/25';

  return (
    <div
      className="space-y-4 px-4 pb-8 pt-2"
      onTouchStart={(e) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const t = e.changedTouches[0];
        const swipe = classifySwipe(t.clientX - start.current.x, t.clientY - start.current.y);
        start.current = null;
        if (swipe) onStep(swipe === 'next' ? 1 : -1);
      }}
    >
      {previewImage && (
        <div className="relative h-48 overflow-hidden rounded border border-navy-border bg-navy">
          <Image src={previewImage} alt={title} fill className="object-contain" unoptimized />
        </div>
      )}

      <p className="text-sm text-parchment-dim">
        <span className="uppercase tracking-wide text-parchment-dim/80">Holder</span>{' '}
        <span className="text-parchment">{selected.holder?.name ?? 'Unresolved'}</span>
      </p>

      <ProvenanceSummary
        takenFromLabel={takenFromLabel}
        currentLocationLabel={currentLocationLabel}
        responsibleLabel={responsibleLabel}
      />

      <div className="flex flex-wrap gap-2">
        {wikidataUrl && (
          <a href={wikidataUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            View on Wikidata ↗
          </a>
        )}
        {primarySourceUrl && (
          <a href={primarySourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Open primary source ↗
          </a>
        )}
        {!wikidataUrl && !primarySourceUrl && (
          <span className="text-sm text-parchment-dim/70">No source link available</span>
        )}
      </div>
    </div>
  );
}
