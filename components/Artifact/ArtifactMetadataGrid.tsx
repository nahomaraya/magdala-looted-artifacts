'use client';
import type { ArtifactCard } from '@/lib/types';
import ArtifactMetadataCard from './ArtifactMetadataCard';
import ArtifactCategoriesCard from './ArtifactCategoriesCard';

/** Hosts that block iframe embedding (X-Frame-Options / CSP → 403 in the frame). */
const NON_EMBEDDABLE_HOSTS = ['britishmuseum.org'];

function isEmbeddable(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return !NON_EMBEDDABLE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export default function ArtifactMetadataGrid({ selected }: { selected: ArtifactCard }) {
  const primarySourceUrl = selected.sourceLinks[0] ?? null;
  const primarySourcePreviewUrl = primarySourceUrl?.startsWith('http://') ? primarySourceUrl.replace('http://', 'https://') : primarySourceUrl;
  const canEmbed = isEmbeddable(primarySourcePreviewUrl);

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
          canEmbed ? (
            <iframe
              title={`Primary source preview for ${selected.title}`}
              src={primarySourcePreviewUrl}
              className="h-125 w-full bg-navy"
            />
          ) : (
            <div className="flex h-125 w-full flex-col items-center justify-center gap-4 bg-navy px-6 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-parchment-dim/60"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <p className="text-base text-parchment-dim">
                This source can’t be displayed here. Open the source link to view the actual item.
              </p>
              <a
                href={primarySourceUrl ?? primarySourcePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-[#daa520]/60 px-4 py-2 text-sm text-[#daa520] hover:bg-[#daa520]/10"
                title={primarySourceUrl ?? undefined}
              >
                Open primary source ↗
              </a>
            </div>
          )
        ) : (
          <div className="px-4 py-6 text-sm text-parchment-dim">No embeddable primary source has been recorded for this artifact.</div>
        )}
      </div>
    </div>
  );
}
