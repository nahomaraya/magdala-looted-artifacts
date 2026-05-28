'use client';
import type { ArtifactCard } from '@/lib/types';

export default function ArtifactActions({
  primarySource,
  handleNextArtifact,
  handlePreviousArtifact,
}: {
  primarySource: string | null;
  handleNextArtifact: () => void;
  handlePreviousArtifact: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {primarySource ? (
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
        onClick={handleNextArtifact}
        className="rounded border border-blue-300/60 bg-blue-500/15 px-4 py-2 text-base font-medium text-blue-100 hover:bg-blue-500/25"
      >
        Next artifact
      </button>

      <button
        type="button"
        onClick={handlePreviousArtifact}
        className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment hover:bg-navy/60"
      >
        Previous artifact
      </button>
    </div>
  );
}
