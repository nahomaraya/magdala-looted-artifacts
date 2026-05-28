'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';

const ReviewMapLeaflet = dynamic(() => import('./ReviewMapLeaflet'), { ssr: false });

type ReviewStatus = 'already' | 'fuzzy' | 'new';

export interface ReviewWikidataHit {
  qid: string;
  label: string;
  imageUrl?: string;
  wikidataUrl: string;
}

interface Props {
  artifacts: ArtifactCard[];
  wikidataHits: Record<string, ReviewWikidataHit>;
}

function getReviewStatus(card: ArtifactCard): ReviewStatus {
  if (card.dedup.method === 'p973' && card.dedup.qid) return 'already';
  if (card.dedup.method === 'fuzzy' && card.dedup.qid) return 'fuzzy';
  return 'new';
}

/** Friendly label for a reference URL — recognised museum / archive domains
 *  get a short institutional name, everything else falls back to hostname. */
const REFERENCE_DOMAIN_LABELS: Record<string, string> = {
  'britishmuseum.org': 'British Museum',
  'bl.uk': 'British Library',
  'vam.ac.uk': 'Victoria & Albert Museum',
  'rct.uk': 'Royal Collection Trust',
  'nationalarmymuseum.org.uk': 'National Army Museum',
  'nms.ac.uk': 'National Museums Scotland',
  'bodleian.ox.ac.uk': 'Bodleian Library',
  'digital.bodleian.ox.ac.uk': 'Bodleian Digital',
  'cudl.lib.cam.ac.uk': 'Cambridge Digital Library',
  'lib.cam.ac.uk': 'Cambridge University Library',
  'rylands.manchester.ac.uk': 'John Rylands Library',
  'pittrivers.ox.ac.uk': 'Pitt Rivers Museum',
  'horniman.ac.uk': 'Horniman Museum',
  'wellcomecollection.org': 'Wellcome Collection',
  'smithsonian.edu': 'Smithsonian',
  'si.edu': 'Smithsonian',
  'archive.org': 'Internet Archive',
  'web.archive.org': 'Wayback Machine',
  'jstor.org': 'JSTOR',
  'andersonandgarland.com': 'Anderson & Garland (auction)',
  'christies.com': "Christie's (auction)",
  'sothebys.com': "Sotheby's (auction)",
  'bonhams.com': 'Bonhams (auction)',
};

function labelForSourceUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, label] of Object.entries(REFERENCE_DOMAIN_LABELS)) {
      if (host === domain || host.endsWith('.' + domain)) return label;
    }
    return host;
  } catch {
    return url;
  }
}

function DedupBadge({ card }: { card: ArtifactCard }) {
  const status = getReviewStatus(card);
  if (status === 'already' && card.dedup.qid) {
    return (
      <span className="inline-flex items-center rounded border border-gray-300/40 bg-gray-500/10 px-2 py-1 text-xs text-gray-300">
        already in Wikidata: {card.dedup.qid}
      </span>
    );
  }
  // if (status === 'fuzzy' && card.dedup.qid) {
  //   return (
  //     <span className="inline-flex items-center rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
  //       fuzzy match needs audit: {card.dedup.qid}
  //     </span>
  //   );
  // }
  // return (
  //   <span className="inline-flex items-center rounded border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
  //     not yet in Wikidata
  //   </span>
  // );
}

const UNKNOWN_HOLDER = 'Unknown / Unresolved';

interface MuseumGroup {
  key: string;            // unique grouping key — usually holder name
  name: string;           // display name
  qid: string | null;
  count: number;
}

export default function ReviewMap({ artifacts, wikidataHits }: Props) {
  const [selectedWpId, setSelectedWpId] = useState<string | null>(artifacts[0]?.wpId ?? null);
  const [selectedMuseum, setSelectedMuseum] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const museumGroups = useMemo<MuseumGroup[]>(() => {
    const groups = new Map<string, MuseumGroup>();
    for (const card of artifacts) {
      const name = card.holder?.name ?? UNKNOWN_HOLDER;
      const existing = groups.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(name, { key: name, name, qid: card.holder?.qid ?? null, count: 1 });
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [artifacts]);

  const filteredArtifacts = useMemo(() => {
    if (!selectedMuseum) return artifacts;
    return artifacts.filter(
      (a) => (a.holder?.name ?? UNKNOWN_HOLDER) === selectedMuseum,
    );
  }, [artifacts, selectedMuseum]);

  // Coords of the currently-filtered holder, used to fly the map there
  // when the rail selection changes. Null when "All artifacts" is active.
  const focusedCoords = useMemo<[number, number] | null>(() => {
    if (!selectedMuseum) return null;
    const withCoords = filteredArtifacts.find((a) => a.holder?.coords);
    return withCoords?.holder?.coords ?? null;
  }, [selectedMuseum, filteredArtifacts]);

  const selected = filteredArtifacts.find((a) => a.wpId === selectedWpId) ?? null;
  const selectedIndex = useMemo(
    () => filteredArtifacts.findIndex((a) => a.wpId === selectedWpId),
    [filteredArtifacts, selectedWpId],
  );

  const handleSelectMuseum = (name: string | null) => {
    setSelectedMuseum(name);
    const nextList = name
      ? artifacts.filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === name)
      : artifacts;
    setSelectedWpId(nextList[0]?.wpId ?? null);
  };

  const handleNextArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const nextIndex = selectedIndex < 0 ? 0 : (selectedIndex + 1) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[nextIndex]?.wpId ?? null);
    setMobileDetailsOpen(true);
    setMobileMenuOpen(false);
  };

  const handlePreviousArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const previousIndex =
      selectedIndex < 0 ? 0 : (selectedIndex - 1 + filteredArtifacts.length) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[previousIndex]?.wpId ?? null);
    setMobileDetailsOpen(true);
    setMobileMenuOpen(false);
  };
  const primarySource = selected?.sourceLinks[0] ?? selected?.url ?? null;

  const selectedWikidata =
    selected?.dedup.method === 'p973' && selected.dedup.qid
      ? wikidataHits[selected.dedup.qid]
      : null;
  const previewImage = selectedWikidata?.imageUrl ?? selected?.imageUrls[0];
  const previewTitle = selectedWikidata?.label ?? selected?.title;
  const takenFromLabel = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';
  const currentLocationLabel = selected?.where ?? selected?.holder?.name ?? 'Unknown';
  const responsibleLabel =
    selected?.holder?.name && selected.holder.name !== UNKNOWN_HOLDER
      ? selected.holder.name
      : null;

  return (
    <div className="flex h-screen bg-navy flex-col md:flex-row">
      {/* Left rail: holders / museums */}
      <aside className="hidden md:block w-64 shrink-0 border-r border-navy-border bg-navy overflow-y-auto">
        <div className="p-4 border-b border-navy-border">
          <h2 className="font-heading text-sm uppercase tracking-wide text-parchment">Holders</h2>
          <p className="text-xs text-parchment-dim mt-1">
            {museumGroups.length} institutions · {artifacts.length} artifacts
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSelectMuseum(null)}
          className={`w-full text-left px-4 py-2 text-sm border-b border-navy-border/40 transition-colors ${
            selectedMuseum === null
              ? 'bg-blue-500/15 text-blue-200'
              : 'text-parchment hover:bg-navy-light/60'
          }`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium">All artifacts</span>
            <span className="text-xs opacity-70">{artifacts.length}</span>
          </span>
        </button>

        {museumGroups.map((g) => {
          const isSelected = selectedMuseum === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => handleSelectMuseum(g.key)}
              className={`w-full text-left px-4 py-2 text-sm border-b border-navy-border/40 transition-colors ${
                isSelected
                  ? 'bg-blue-500/15 text-blue-200'
                  : 'text-parchment hover:bg-navy-light/60'
              }`}
              title={g.qid ? `${g.name} (${g.qid})` : g.name}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{g.name}</span>
                <span className="shrink-0 text-xs opacity-70">{g.count}</span>
              </div>
              {g.qid && (
                <span className="block text-[10px] font-mono text-parchment-dim mt-0.5">{g.qid}</span>
              )}
            </button>
          );
        })}
      </aside>

      {/* Mobile compact header: hamburger, title, view details, next artifact */}
      <div className="md:hidden w-full border-b border-navy-border bg-navy-light/80 p-3 flex items-center gap-3">
        <button
          aria-label="Open museums"
          onClick={() => setMobileMenuOpen((s) => !s)}
          className="rounded px-2 py-1 text-parchment-dim hover:bg-navy/50"
        >
          <span className="text-2xl leading-none">≡</span>
        </button>

        <h1 className="font-heading text-lg text-parchment truncate flex-1">
          {previewTitle ?? selected?.title ?? 'No artifact selected.'}
        </h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileDetailsOpen(true)}
            className="rounded border border-parchment-dim/30 bg-navy px-3 py-1 text-sm text-parchment hover:bg-navy/60"
          >
            View details
          </button>
          <button
            type="button"
            onClick={handleNextArtifact}
            className="rounded border border-blue-300/60 bg-blue-500/15 px-3 py-1 text-sm font-medium text-blue-100 hover:bg-blue-500/25"
          >
            Next artifact
          </button>
          <button
            type="button"
            onClick={handlePreviousArtifact}
            className="rounded border border-parchment-dim/30 bg-navy px-3 py-1 text-sm text-parchment hover:bg-navy/60"
          >
            Previous artifact
          </button>
        </div>
      </div>

      {/* Mobile museums menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-auto bg-navy/95 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl text-parchment">Holders</h2>
            <button
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              className="text-parchment-dim px-2 py-1"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { handleSelectMuseum(null); setMobileMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm rounded bg-navy/40 text-parchment"
            >
              All artifacts · {artifacts.length}
            </button>
            {museumGroups.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => { handleSelectMuseum(g.key); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm rounded bg-navy/30 text-parchment"
                title={g.qid ? `${g.name} (${g.qid})` : g.name}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{g.name}</span>
                  <span className="text-xs opacity-70">{g.count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile details overlay */}
      {mobileDetailsOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-auto bg-navy/95 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl text-parchment">Details</h2>
            <div className="flex items-center gap-2">
              <button
                aria-label="Close details"
                onClick={() => setMobileDetailsOpen(false)}
                className="text-parchment-dim px-2 py-1"
              >
                Close
              </button>
            </div>
          </div>

          {!selected ? (
            <div className="text-parchment-dim">No artifact selected.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded border border-navy-border/70 bg-navy/70 px-4 py-4">
                <h3 className="font-heading text-2xl text-parchment truncate">{previewTitle ?? selected.title}</h3>
                <p className="text-sm text-parchment-dim mt-1">WP #{selected.wpId} · {selectedIndex + 1} / {filteredArtifacts.length}{selectedMuseum && <span className="ml-1 opacity-70"> in {selectedMuseum}</span>}</p>
              </div>

              {previewImage && previewTitle && (
                <div className="relative h-56 rounded border border-navy-border overflow-hidden bg-navy">
                  <Image src={previewImage} alt={previewTitle} fill className="object-contain" unoptimized />
                </div>
              )}

              <div className="flex gap-2">
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
                  className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment hover:bg-navy/60"
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

                <button
                  type="button"
                  onClick={() => { setMobileDetailsOpen(false); setMobileMenuOpen(false); }}
                  className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 text-base">
                <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
                  <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Holder</span>
                  <span className="mt-1 block text-parchment">{selected.holder?.name ?? 'Unresolved'}{selected.holder?.qid ? ` (${selected.holder.qid})` : ''}</span>
                </p>
                <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
                  <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Primary category</span>
                  <span className="mt-1 block text-parchment">{selected.primaryCategory?.name ?? 'Unresolved'}{selected.primaryCategory?.qid ? ` (${selected.primaryCategory.qid})` : ''}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0 relative">
        <ReviewMapLeaflet
          artifacts={filteredArtifacts}
          wikidataHits={wikidataHits}
          selectedWpId={selectedWpId}
          onSelect={setSelectedWpId}
          focusCoords={focusedCoords}
        />
      </div>

      <aside className="hidden md:block w-185 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
        {!selected ? (
          <div className="p-6 text-base text-parchment-dim">No artifact selected.</div>
        ) : (
          <div className="p-6 xl:p-8 space-y-6">
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

            {/* <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl text-parchment leading-tight">Review map</h2>
              <DedupBadge card={selected} />
            </div> */}

            {previewImage && previewTitle && (
              <div className="relative h-64 rounded border border-navy-border overflow-hidden bg-navy">
                <Image src={previewImage} alt={previewTitle} fill className="object-contain" unoptimized />
              </div>
            )}

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

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-4">
                <div className="grid gap-3 text-base sm:grid-cols-2">
                  <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
                    <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Holder</span>
                    <span className="mt-1 block text-parchment">
                      {selected.holder?.name ?? 'Unresolved'}
                      {selected.holder?.qid ? ` (${selected.holder.qid})` : ''}
                    </span>
                  </p>
                  <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
                    <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Primary category</span>
                    <span className="mt-1 block text-parchment">
                      {selected.primaryCategory?.name ?? 'Unresolved'}
                      {selected.primaryCategory?.qid ? ` (${selected.primaryCategory.qid})` : ''}
                    </span>
                  </p>
                  {selected.maqdalaConfidence && (
                    <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
                      <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Maqdala confidence</span>
                      <span className="mt-1 block text-parchment">{selected.maqdalaConfidence}</span>
                    </p>
                  )}
                  <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim sm:col-span-2">
                    <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Categories</span>
                    <span className="mt-1 block text-parchment">
                      {selected.allCategories.length > 0
                        ? selected.allCategories
                            .map((c) => (c.qid ? `${c.name} (${c.qid})` : c.name))
                            .join(', ')
                        : 'None'}
                    </span>
                  </p>
                </div>
              </div>

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
                    <p className="text-base italic text-parchment-dim">
                      No external references on file for this artifact.
                    </p>
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
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
