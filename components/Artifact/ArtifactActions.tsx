'use client';
import type { Presentation } from './presentation';

export default function ArtifactActions({
  presentation,
  onNext,
  onPrev,
}: {
  presentation: Presentation;
  onNext: () => void;
  onPrev: () => void;
}) {
  const { wikidataUrl, primarySource } = presentation;
  return (
    <div className="flex flex-wrap gap-2">
      {wikidataUrl ? (
        <a
          href={wikidataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-blue-300/60 bg-blue-500/15 px-4 py-2 text-base font-medium text-blue-100 hover:bg-blue-500/25"
        >
          View on Wikidata ↗
        </a>
      ) : primarySource ? (
        <a
          href={primarySource}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-blue-300/60 bg-blue-500/15 px-4 py-2 text-base font-medium text-blue-100 hover:bg-blue-500/25"
        >
          Open source URL ↗
        </a>
      ) : (
        <span className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment-dim/60">
          No source URL available
        </span>
      )}

      <button
        type="button"
        onClick={onNext}
        className="rounded border border-blue-300/60 bg-blue-500/15 px-4 py-2 text-base font-medium text-blue-100 hover:bg-blue-500/25"
      >
        Next artifact
      </button>

      <button
        type="button"
        onClick={onPrev}
        className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment hover:bg-navy/60"
      >
        Previous artifact
      </button>
    </div>
  );
}
