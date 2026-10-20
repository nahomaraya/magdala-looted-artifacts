'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { useReviewSession } from './useReviewSession';

const ReviewMapLeaflet = dynamic(() => import('./ReviewMapLeaflet'), { ssr: false });
import { ArtifactPane } from '../Artifact';
import LeftRail from './LeftRail';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import MobileDetails from './MobileDetails';
import { type ReviewWikidataHit } from './reviewMapUtils';
import { UNKNOWN_HOLDER } from './reviewSession';

export type { ReviewWikidataHit };

interface Props {
  artifacts: ArtifactCard[];
  wikidataHits: Record<string, ReviewWikidataHit>;
  initialSelectedWpId?: string | null;
}

export default function ReviewMap({ artifacts, wikidataHits, initialSelectedWpId = null }: Props) {
  const [view, dispatch] = useReviewSession(artifacts, initialSelectedWpId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const goNext = () => { dispatch({ t: 'next' }); setMobileDetailsOpen(true); setMobileMenuOpen(false); };
  const goPrev = () => { dispatch({ t: 'prev' }); setMobileDetailsOpen(true); setMobileMenuOpen(false); };

  // Task 5's presentation module replaces these inline derivations.
  const selected = view.selected;
  const primarySource = selected?.sourceLinks[0] ?? selected?.url ?? null;
  const selectedWikidata =
    selected?.dedup.method === 'p973' && selected.dedup.qid ? wikidataHits[selected.dedup.qid] : null;
  const wikidataUrl =
    selectedWikidata?.wikidataUrl ??
    (selected?.dedup.qid ? `https://www.wikidata.org/wiki/${selected.dedup.qid}` : null);
  const previewImage = selectedWikidata?.imageUrl ?? selected?.imageUrls[0];
  const previewTitle = selectedWikidata?.label ?? selected?.title;
  const takenFromLabel = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';
  const currentLocationLabel = selected?.where ?? selected?.holder?.name ?? 'Unknown';
  const responsibleLabel =
    selected?.holder?.name && selected.holder.name !== UNKNOWN_HOLDER ? selected.holder.name : null;

  return (
    <div className="flex h-screen bg-navy flex-col md:flex-row">
      <LeftRail
        holderGroups={view.holderGroups}
        artifacts={view.filtered}
        selectedHolder={view.holder}
        selectedWpId={view.selected?.wpId ?? null}
        onSelectHolder={(name) => dispatch({ t: 'selectHolder', name })}
        onSelectArtifact={(wpId) => dispatch({ t: 'selectArtifact', wpId })}
      />

      <MobileHeader
        previewTitle={previewTitle ?? null}
        onToggleMenu={() => setMobileMenuOpen((s) => !s)}
        onOpenDetails={() => setMobileDetailsOpen(true)}
        onNext={goNext}
        onPrev={goPrev}
      />

      <MobileMenu
        mobileMenuOpen={mobileMenuOpen}
        holderGroups={view.holderGroups}
        artifacts={view.filtered}
        onClose={() => setMobileMenuOpen(false)}
        onSelectHolder={(name) => { dispatch({ t: 'selectHolder', name }); setMobileMenuOpen(false); }}
        showWeakLink={view.showWeakLink}
        onToggleWeakLink={() => dispatch({ t: 'toggleWeakLink' })}
        showReturnedOnly={view.showReturnedOnly}
        onToggleReturnedOnly={() => dispatch({ t: 'toggleReturnedOnly' })}
        returnedCount={view.returnedCount}
      />

      <MobileDetails
        mobileDetailsOpen={mobileDetailsOpen}
        selected={selected}
        previewTitle={previewTitle ?? null}
        previewImage={previewImage}
        selectedIndex={view.selectedIndex}
        count={view.filtered.length}
        selectedHolder={view.holder}
        onClose={() => { setMobileDetailsOpen(false); setMobileMenuOpen(false); }}
        onNext={goNext}
        onPrev={goPrev}
      />

      <div className="flex-1 min-w-0 relative">
        <ReviewMapLeaflet
          artifacts={view.filtered}
          wikidataHits={wikidataHits}
          selectedWpId={view.selected?.wpId ?? null}
          onSelect={(wpId) => dispatch({ t: 'selectArtifact', wpId })}
          focusCoords={null}
        />
        <div className="hidden md:flex absolute top-3 right-3 z-1000 flex-col items-end gap-2 group">
          <Link
            href="/library"
            className="rounded bg-gold px-3 py-1.5 text-xs font-semibold text-navy shadow transition-colors hover:bg-gold-light"
          >
            View library
          </Link>
          <button
            type="button"
            onClick={() => dispatch({ t: 'toggleReturnedOnly' })}
            disabled={view.returnedCount === 0}
            title={
              view.returnedCount === 0
                ? 'No artifacts recorded as returned yet'
                : 'Show only artifacts repatriated to Ethiopia'
            }
            className={`px-3 py-1.5 rounded text-xs font-medium shadow transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              view.showReturnedOnly
                ? 'bg-emerald-500/80 text-white hover:bg-emerald-500'
                : 'bg-navy/80 text-parchment hover:bg-navy backdrop-blur-sm'
            }`}
          >
            {view.showReturnedOnly ? 'Show all objects' : `Returned to Ethiopia (${view.returnedCount})`}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ t: 'toggleWeakLink' })}
            disabled={view.showReturnedOnly}
            className={`px-3 py-1.5 rounded text-xs font-medium shadow transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              view.showWeakLink
                ? 'bg-blue-500/80 text-white hover:bg-blue-500'
                : 'bg-navy/80 text-parchment hover:bg-navy backdrop-blur-sm'
            }`}
          >
            {view.showWeakLink ? 'Hide weak link objects' : 'Show weak link objects'}
          </button>
          <span className="pointer-events-none absolute top-full right-0 mt-2 w-56 rounded bg-navy px-3 py-2 text-xs text-parchment-dim shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
            Items with a weaker link to the expedition and the battle than others.
          </span>
        </div>
      </div>

      <ArtifactPane
        selected={selected}
        previewTitle={previewTitle}
        selectedIndex={view.selectedIndex}
        filteredArtifacts={view.filtered}
        selectedMuseum={view.holder}
        previewImage={previewImage}
        primarySource={primarySource}
        wikidataUrl={wikidataUrl}
        handleNextArtifact={goNext}
        handlePreviousArtifact={goPrev}
        takenFromLabel={takenFromLabel}
        currentLocationLabel={currentLocationLabel}
        responsibleLabel={responsibleLabel}
      />
    </div>
  );
}

