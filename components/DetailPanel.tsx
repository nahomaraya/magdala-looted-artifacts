'use client';

import Image from 'next/image';
import { ProvenanceTimeline } from './ProvenanceTimeline';
import type { Artifact } from '@/lib/types';

interface Props {
  artifact: Artifact;
  onClose: () => void;
}

const IFRAME_PROPS = ['P5199', 'P1711'];

export function DetailPanel({ artifact, onClose }: Props) {
  const iframeIdentifiers = artifact.identifiers.filter((id) =>
    IFRAME_PROPS.includes(id.property),
  );

  return (
    <div className="detail-panel-enter absolute inset-y-0 right-0 w-[420px] bg-[#12121f] border-l border-[#2a2a45] flex flex-col z-[1000] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#2a2a45] flex-shrink-0">
        <h2
          className="font-heading text-base font-semibold text-[#f4ead5] leading-tight pr-4"
          title={artifact.label}
        >
          {artifact.label}
        </h2>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-[#2a2a45] text-[#c8b89a] hover:text-[#f4ead5] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        {artifact.imageUrl && (
          <div className="relative w-full h-52 bg-[#1a1a30]">
            <Image
              src={artifact.imageUrl}
              alt={artifact.label}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Description */}
          {artifact.description && (
            <p className="text-sm text-[#c8b89a] leading-relaxed">{artifact.description}</p>
          )}

          {/* Current location */}
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[#52b788]/10 border border-[#52b788]/30">
            <span className="w-2 h-2 rounded-full bg-[#52b788] flex-shrink-0" />
            <div>
              <span className="text-xs text-[#52b788] uppercase tracking-wider font-semibold">
                Current Location
              </span>
              <p className="text-sm text-[#f4ead5]">{artifact.currentLocation.name}</p>
            </div>
          </div>

          {/* Provenance */}
          <section>
            <h3 className="font-heading text-xs uppercase tracking-widest text-[#daa520] mb-3">
              Provenance
            </h3>
            {artifact.provenance.length > 0 ? (
              <ProvenanceTimeline
                events={artifact.provenance}
                currentLocationName={artifact.currentLocation.name}
              />
            ) : (
              <p className="text-xs text-[#c8b89a]">No provenance data on Wikidata.</p>
            )}
          </section>

          {/* External identifiers */}
          {artifact.identifiers.length > 0 && (
            <section>
              <h3 className="font-heading text-xs uppercase tracking-widest text-[#daa520] mb-3">
                External Links
              </h3>
              <div className="flex flex-col gap-2">
                {artifact.identifiers.map((id) => (
                  <a
                    key={id.property}
                    href={id.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm text-[#c8b89a] hover:text-[#daa520] transition-colors group"
                  >
                    <span className="font-semibold text-[#f4ead5] group-hover:text-[#daa520]">
                      {id.propertyLabel}
                    </span>
                    <span className="flex items-center gap-1 text-xs opacity-70 group-hover:opacity-100">
                      {id.value}
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Embedded iframes */}
          {iframeIdentifiers.map((id) => (
            <section key={id.property}>
              <h3 className="font-heading text-xs uppercase tracking-widest text-[#daa520] mb-2">
                {id.propertyLabel} Preview
              </h3>
              <a
                href={id.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-[#c8b89a] hover:text-[#daa520] mb-2 truncate"
              >
                {id.url}
              </a>
              <iframe
                src={id.url}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full h-48 rounded border border-[#2a2a45] bg-[#1a1a30]"
                title={`${id.propertyLabel} viewer`}
              />
            </section>
          ))}

          {/* Wikidata link */}
          <a
            href={artifact.wikidataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[#c8b89a] hover:text-[#daa520] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            View on Wikidata ({artifact.qid})
          </a>
        </div>
      </div>
    </div>
  );
}
