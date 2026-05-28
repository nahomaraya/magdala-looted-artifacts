'use client';
import { labelForSourceUrl } from '../reviewMapUtils';
import type { ArtifactCard } from '@/lib/types';

export default function ProvenanceReferences({
  selected,
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
}: {
  selected: ArtifactCard;
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded border border-navy-border/70 bg-navy/60 px-4 py-4 text-base text-parchment-dim">
        <p className="text-parchment text-lg font-medium">Provenance</p>
        <div className="mt-3 space-y-2">
          <p>
            <span className="text-parchment">Taken from:</span> {takenFromLabel}
          </p>
          <p>
            <span className="text-parchment">Current location:</span> {currentLocationLabel}
          </p>
          {responsibleLabel && (
            <p>
              <span className="text-parchment">Responsible institution:</span> {responsibleLabel}
            </p>
          )}
        </div>
      </div>

      <div className="rounded border border-navy-border/70 bg-navy/60 px-4 py-4 space-y-3">
        <p className="text-lg font-medium text-parchment">References</p>
        {selected.sourceLinks.length > 0 ? (
          <div className="space-y-2">
            {selected.sourceLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded border border-navy-border/50 bg-navy/30 px-3 py-2 text-base text-parchment hover:border-[#daa520]/50 hover:text-[#daa520]"
                title={link}
              >
                <span className="block text-sm uppercase tracking-wide text-parchment-dim">
                  {labelForSourceUrl(link)}
                </span>
                <span className="block truncate">{link}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-base italic text-parchment-dim">No external references on file for this artifact.</p>
        )}

        <a
          href={selected.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm text-parchment-dim hover:text-[#daa520]"
          title={selected.url}
        >
          Source post on theprinceandtheplunder.com ↗
        </a>
      </div>
    </div>
  );
}
