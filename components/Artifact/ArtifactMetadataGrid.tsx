'use client';
import type { ArtifactCard } from '@/lib/types';
import ArtifactMetadataCard from './ArtifactMetadataCard';
import ArtifactCategoriesCard from './ArtifactCategoriesCard';

export default function ArtifactMetadataGrid({ selected }: { selected: ArtifactCard }) {
  const primarySourceUrl = selected.sourceLinks[0] ?? null;
  const primarySourcePreviewUrl = primarySourceUrl?.startsWith('http://') ? primarySourceUrl.replace('http://', 'https://') : primarySourceUrl;

  return (
    <div className="grid gap-3 text-base sm:grid-cols-2">
      {/* <ArtifactMetadataCard
        label="Holder"
        value={selected.holder ? `${selected.holder.name ?? 'Unresolved'}${selected.holder.qid ? ` (${selected.holder.qid})` : ''}` : 'Unresolved'}
      /> */}
      {/* <ArtifactMetadataCard
        label="Primary category"
        value={selected.primaryCategory ? `${selected.primaryCategory.name ?? 'Unresolved'}${selected.primaryCategory.qid ? ` (${selected.primaryCategory.qid})` : ''}` : 'Unresolved'}
      /> */}
      {/* <ArtifactMetadataCard label="Maqdala confidence" value={selected.maqdalaConfidence ?? null} /> */}
      <ArtifactCategoriesCard categories={selected.allCategories} />

      <div className="sm:col-span-2 rounded border border-navy-border/60 bg-navy/40 overflow-hidden">
        {/* <div className="flex items-center justify-between gap-3 border-b border-navy-border/60 px-4 py-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-parchment-dim/80">Source preview</p>
            <p className="text-sm text-parchment-dim">Embedded view of the primary source URL</p>
          </div>
          {primarySourceUrl ? (
            <a
              href={primarySourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#daa520] hover:underline"
              title={primarySourceUrl}
            >
              Open primary source ↗
            </a>
          ) : (
            <span className="text-sm text-parchment-dim">No primary source URL available</span>
          )}
        </div> */}

        {primarySourcePreviewUrl ? (
          <iframe
            title={`Primary source preview for ${selected.title}`}
            src={primarySourcePreviewUrl}
            className="h-125 w-full bg-navy"
          />
        ) : (
          <div className="px-4 py-6 text-sm text-parchment-dim">No embeddable primary source has been recorded for this artifact.</div>
        )}
      </div>
    </div>
  );
}
