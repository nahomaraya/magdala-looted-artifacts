'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { buildQuickStatementsUrl } from '@/lib/quickstatements';

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
  if (status === 'fuzzy' && card.dedup.qid) {
    return (
      <span className="inline-flex items-center rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
        fuzzy match needs audit: {card.dedup.qid}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-blue-400/40 bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
      not yet in Wikidata
    </span>
  );
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
  const [copied, setCopied] = useState(false);

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

  const qs = useMemo(
    () => (selected && !selected.dedup.qid ? buildQuickStatementsUrl(selected) : null),
    [selected],
  );

  const handleCopyCommands = async () => {
    if (!qs) return;
    try {
      await navigator.clipboard.writeText(qs.commands);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy QuickStatements commands:', err);
    }
  };

  const selectNextArtifact = () => {
    if (filteredArtifacts.length === 0) return;
    const currentIndex = selectedIndex >= 0 ? selectedIndex : -1;
    const nextIndex = (currentIndex + 1) % filteredArtifacts.length;
    setSelectedWpId(filteredArtifacts[nextIndex].wpId);
  };

  const selectedWikidata =
    selected?.dedup.method === 'p973' && selected.dedup.qid
      ? wikidataHits[selected.dedup.qid]
      : null;
  const previewImage = selectedWikidata?.imageUrl ?? selected?.imageUrls[0];
  const previewTitle = selectedWikidata?.label ?? selected?.title;

  return (
    <div className="flex h-screen bg-navy">
      {/* Left rail: holders / museums */}
      <aside className="w-64 shrink-0 border-r border-navy-border bg-navy overflow-y-auto">
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

      <div className="flex-1 min-w-0 relative">
        <ReviewMapLeaflet
          artifacts={filteredArtifacts}
          wikidataHits={wikidataHits}
          selectedWpId={selectedWpId}
          onSelect={setSelectedWpId}
          focusCoords={focusedCoords}
        />
      </div>

      <aside className="w-[420px] shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
        {!selected ? (
          <div className="p-6 text-sm text-parchment-dim">No artifact selected.</div>
        ) : (
          <div className="p-5 space-y-4">
            <h1 className="font-heading text-xl text-parchment leading-tight">Review map</h1>
            <DedupBadge card={selected} />

            {previewImage && previewTitle && (
              <div className="relative h-52 rounded border border-navy-border overflow-hidden bg-navy">
                <Image src={previewImage} alt={previewTitle} fill className="object-contain" unoptimized />
              </div>
            )}

            <div>
              <h2 className="font-heading text-lg text-parchment leading-tight">
                {previewTitle ?? selected.title}
              </h2>
              <p className="text-xs text-parchment-dim mt-1">
                WP #{selected.wpId} · {selectedIndex + 1} / {filteredArtifacts.length}
                {selectedMuseum && <span className="ml-1 opacity-70">in {selectedMuseum}</span>}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-parchment-dim">
                <span className="text-parchment">Holder:</span> {selected.holder?.name ?? 'Unresolved'}
                {selected.holder?.qid ? ` (${selected.holder.qid})` : ''}
              </p>
              <p className="text-parchment-dim">
                <span className="text-parchment">Primary category:</span>{' '}
                {selected.primaryCategory?.name ?? 'Unresolved'}
                {selected.primaryCategory?.qid ? ` (${selected.primaryCategory.qid})` : ''}
              </p>
              {selected.maqdalaConfidence && (
                <p className="text-parchment-dim">
                  <span className="text-parchment">Maqdala confidence:</span> {selected.maqdalaConfidence}
                </p>
              )}

              <p className="text-parchment-dim">
                <span className="text-parchment">Categories:</span>{' '}
                {selected.allCategories.length > 0
                  ? selected.allCategories
                      .map((c) => (c.qid ? `${c.name} (${c.qid})` : c.name))
                      .join(', ')
                  : 'None'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectNextArtifact}
                className="rounded border border-parchment-dim/40 bg-navy px-3 py-1.5 text-sm text-parchment hover:border-parchment-dim/70"
              >
                Next artifact →
              </button>

              {selected.dedup.qid ? (
                <a
                  href={
                    selected.dedup.method === 'p973'
                      ? selectedWikidata?.wikidataUrl ?? `https://www.wikidata.org/wiki/${selected.dedup.qid}`
                      : `https://www.wikidata.org/wiki/${selected.dedup.qid}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-gray-300/40 bg-gray-500/10 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-500/20"
                >
                  View on Wikidata
                </a>
              ) : qs?.fits ? (
                <>
                  <a
                    href={qs.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-200 hover:bg-blue-500/20"
                  >
                    Open in QuickStatements
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyCommands}
                    className="rounded border border-parchment-dim/40 bg-navy px-3 py-1.5 text-sm text-parchment-dim hover:border-parchment-dim/70"
                    title="Copy raw V1 commands to clipboard"
                  >
                    {copied ? 'Copied!' : 'Copy commands'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCopyCommands}
                    className="rounded border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/20"
                    title={qs ? `URL too long (${qs.byteLength}b); copy & paste manually` : ''}
                  >
                    {copied ? 'Copied — paste in QS' : 'Copy commands (URL too long)'}
                  </button>
                  <a
                    href="https://quickstatements.toolforge.org/#/batch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-parchment-dim/40 bg-navy px-3 py-1.5 text-sm text-parchment-dim hover:border-parchment-dim/70"
                  >
                    Open QuickStatements ↗
                  </a>
                </>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {selected.sourceLinks.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-parchment-dim">
                    References ({selected.sourceLinks.length})
                  </p>
                  {selected.sourceLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-parchment hover:text-[#daa520]"
                      title={link}
                    >
                      {labelForSourceUrl(link)} <span className="opacity-50">↗</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-parchment-dim">
                  No external references on file for this artifact.
                </p>
              )}

              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs text-parchment-dim hover:text-[#daa520]"
                title={selected.url}
              >
                Source post on theprinceandtheplunder.com ↗
              </a>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
