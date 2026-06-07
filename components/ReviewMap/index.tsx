'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ArtifactCard } from '@/lib/types';
import { useReviewMapState } from './useReviewMapState';

const ReviewMapLeaflet = dynamic(() => import('./ReviewMapLeaflet'), { ssr: false });
import { ArtifactPane } from '../Artifact';
import LeftRail from './LeftRail';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import MobileDetails from './MobileDetails';
import { type ReviewWikidataHit } from './reviewMapUtils';

export type { ReviewWikidataHit };

interface Props {
  artifacts: ArtifactCard[];
  wikidataHits: Record<string, ReviewWikidataHit>;
  initialSelectedWpId?: string | null;
}

export default function ReviewMap({ artifacts, wikidataHits, initialSelectedWpId = null }: Props) {
  const {
    selectedWpId,
    setSelectedWpId,
    selectedMuseum,
    setSelectedMuseum,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileDetailsOpen,
    setMobileDetailsOpen,
    museumGroups,
    visibleArtifacts,
    filteredArtifacts,
    focusedCoords,
    selected,
    selectedIndex,
    handleSelectMuseum,
    handleNextArtifact,
    handlePreviousArtifact,
    showWeakLinkArtifacts,
    setShowWeakLinkArtifacts,
    showReturnedOnly,
    setShowReturnedOnly,
    returnedCount,
    primarySource,
    previewImage,
    previewTitle,
    takenFromLabel,
    currentLocationLabel,
    responsibleLabel,
  } = useReviewMapState(artifacts, wikidataHits, initialSelectedWpId);

  return (
    <div className="flex h-screen bg-navy flex-col md:flex-row">
      <LeftRail
        museumGroups={museumGroups}
        artifacts={visibleArtifacts}
        selectedMuseum={selectedMuseum}
        selectedWpId={selectedWpId}
        onSelectMuseum={handleSelectMuseum}
        onSelectArtifact={setSelectedWpId}
      />

      <MobileHeader
        previewTitle={previewTitle ?? null}
        onToggleMenu={() => setMobileMenuOpen((s) => !s)}
        onOpenDetails={() => setMobileDetailsOpen(true)}
        onNext={handleNextArtifact}
        onPrev={handlePreviousArtifact}
      />

      <MobileMenu
        mobileMenuOpen={mobileMenuOpen}
        museumGroups={museumGroups}
        artifacts={visibleArtifacts}
        onClose={() => setMobileMenuOpen(false)}
        onSelectMuseum={(name) => { handleSelectMuseum(name); setMobileMenuOpen(false); }}
        showWeakLinkArtifacts={showWeakLinkArtifacts}
        onToggleWeakLinkArtifacts={() => setShowWeakLinkArtifacts((s) => !s)}
        showReturnedOnly={showReturnedOnly}
        onToggleReturnedOnly={() => setShowReturnedOnly((s) => !s)}
        returnedCount={returnedCount}
      />

      <MobileDetails
        mobileDetailsOpen={mobileDetailsOpen}
        selected={selected}
        previewTitle={previewTitle ?? null}
        previewImage={previewImage}
        selectedIndex={selectedIndex}
        filteredArtifacts={filteredArtifacts}
        selectedMuseum={selectedMuseum}
        onClose={() => { setMobileDetailsOpen(false); setMobileMenuOpen(false); }}
        onNext={handleNextArtifact}
        onPrev={handlePreviousArtifact}
      />

      <div className="flex-1 min-w-0 relative">
        <ReviewMapLeaflet
          artifacts={filteredArtifacts}
          wikidataHits={wikidataHits}
          selectedWpId={selectedWpId}
          onSelect={setSelectedWpId}
          focusCoords={focusedCoords}
        />
        <div className="hidden md:flex absolute top-3 right-3 z-1000 flex-col items-end gap-2 group">
          <Link
            href="/looted-library"
            className="rounded bg-gold px-3 py-1.5 text-xs font-semibold text-navy shadow transition-colors hover:bg-gold-light"
          >
            View library
          </Link>
          <button
            type="button"
            onClick={() => setShowReturnedOnly((s) => !s)}
            disabled={returnedCount === 0}
            title={
              returnedCount === 0
                ? 'No artifacts recorded as returned yet'
                : 'Show only artifacts repatriated to Ethiopia'
            }
            className={`px-3 py-1.5 rounded text-xs font-medium shadow transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              showReturnedOnly
                ? 'bg-emerald-500/80 text-white hover:bg-emerald-500'
                : 'bg-navy/80 text-parchment hover:bg-navy backdrop-blur-sm'
            }`}
          >
            {showReturnedOnly ? 'Show all objects' : `Returned to Ethiopia (${returnedCount})`}
          </button>
          <button
            type="button"
            onClick={() => setShowWeakLinkArtifacts((s) => !s)}
            disabled={showReturnedOnly}
            className={`px-3 py-1.5 rounded text-xs font-medium shadow transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              showWeakLinkArtifacts
                ? 'bg-blue-500/80 text-white hover:bg-blue-500'
                : 'bg-navy/80 text-parchment hover:bg-navy backdrop-blur-sm'
            }`}
          >
            {showWeakLinkArtifacts ? 'Hide weak link objects' : 'Show weak link objects'}
          </button>
          <span className="pointer-events-none absolute top-full right-0 mt-2 w-56 rounded bg-navy px-3 py-2 text-xs text-parchment-dim shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
            Items with a weaker link to the expedition and the battle than others.
          </span>
        </div>
      </div>

      <ArtifactPane
        selected={selected}
        previewTitle={previewTitle}
        selectedIndex={selectedIndex}
        filteredArtifacts={filteredArtifacts}
        selectedMuseum={selectedMuseum}
        previewImage={previewImage}
        primarySource={primarySource}
        handleNextArtifact={handleNextArtifact}
        handlePreviousArtifact={handlePreviousArtifact}
        takenFromLabel={takenFromLabel}
        currentLocationLabel={currentLocationLabel}
        responsibleLabel={responsibleLabel}
      />
    </div>
  );
}

