'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ProvenanceTimeline } from './ProvenanceTimeline';
import type { Artifact, ExternalIdentifier } from '@/lib/types';

// ── Iframe preload cache ──────────────────────────────────────────────────────
// preloadedSet: URLs for which a hidden preload iframe has been injected.
// loadedSet:    URLs whose hidden iframe has fired onload (browser cache warm).
// Both survive across artifact selections and DetailPanel mount/unmount cycles.
const preloadedSet = new Set<string>();
const loadedSet = new Set<string>();

export function preloadIdentifierUrls(urls: string[]): void {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('__iframe_preload_cache__') as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = '__iframe_preload_cache__';
    container.setAttribute(
      'style',
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;visibility:hidden;pointer-events:none;',
    );
    document.body.appendChild(container);
  }

  for (const url of urls) {
    if (preloadedSet.has(url)) continue;
    preloadedSet.add(url);

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.addEventListener('load', () => loadedSet.add(url), { once: true });
    container.appendChild(iframe);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  artifact: Artifact;
  onClose: () => void;
}

// The fallback link is shown immediately. The iframe loads silently in the
// background (universities / institutional sites can be slow). If it loads
// successfully it fades in over the fallback; if it never loads the link stays.
function EmbeddablePreview({ identifier }: { identifier: ExternalIdentifier }) {
  // Initialise as already-loaded when the background preload already completed.
  const [embedded, setEmbedded] = useState(() => loadedSet.has(identifier.url));

  useEffect(() => {
    setEmbedded(loadedSet.has(identifier.url));
  }, [identifier.url]);

  return (
    <div className="relative w-full h-52 bg-[#251406]">
      {/* Fallback link — always present until the iframe proves it can load */}
      {!embedded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 z-10">
          <p className="text-xs text-[#c8b89a] italic text-center">
            Loading external content in the background…
          </p>
          <a
            href={identifier.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 rounded border border-[#daa520]/60 bg-[#daa520]/10 text-[#daa520] text-sm font-heading hover:bg-[#daa520]/20 transition-colors"
          >
            View {identifier.propertyLabel} ↗
          </a>
        </div>
      )}

      {/* iframe loads silently; fades in only on success */}
      <iframe
        src={identifier.url}
        onLoad={() => {
          loadedSet.add(identifier.url);
          setEmbedded(true);
        }}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
        className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-500 ${
          embedded ? 'opacity-100 z-20' : 'opacity-0 pointer-events-none'
        }`}
        title={`${identifier.propertyLabel} preview`}
      />
    </div>
  );
}

const PANEL_MIN = 300;
const PANEL_MAX = 720;

export function DetailPanel({ artifact, onClose }: Props) {
  const [panelWidth, setPanelWidth] = useState(420);
  const panelWidthRef = useRef(420);
  panelWidthRef.current = panelWidth;

  const firstIdentifier = artifact.identifiers[0] ?? null;
  const showEmbeddedPreview = !artifact.imageUrl && firstIdentifier !== null;

  const startPanelDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidthRef.current;

    const onMove = (ev: MouseEvent) => {
      // dragging left (negative delta) widens the panel
      setPanelWidth(Math.max(PANEL_MIN, Math.min(PANEL_MAX, startW + startX - ev.clientX)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="detail-panel-enter absolute inset-y-0 right-0 bg-[#1a0e06] border-l border-[#4a2c0e] flex flex-col z-[1000] shadow-2xl overflow-hidden"
      style={{ width: panelWidth }}
    >
      {/* Left-edge drag handle */}
      <div
        onMouseDown={startPanelDrag}
        className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize group z-20"
      >
        <div className="h-full w-full bg-[#4a2c0e] group-hover:bg-[#daa520]/60 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[#4a2c0e] flex-shrink-0">
        <h2
          className="font-heading text-base font-semibold text-[#f4ead5] leading-tight pr-4"
          title={artifact.label}
        >
          {artifact.label}
        </h2>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-[#4a2c0e] text-[#c8b89a] hover:text-[#f4ead5] transition-colors"
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
        {/* Image — or embedded identifier if no image available */}
        {artifact.imageUrl ? (
          <div className="relative w-full h-52 bg-[#251406]">
            <Image
              src={artifact.imageUrl}
              alt={artifact.label}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        ) : showEmbeddedPreview ? (
          <EmbeddablePreview identifier={firstIdentifier!} />
        ) : null}

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
