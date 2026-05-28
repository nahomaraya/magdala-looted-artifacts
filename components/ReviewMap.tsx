'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { useReviewMapState } from './useReviewMapState';

const ReviewMapLeaflet = dynamic(() => import('./ReviewMapLeaflet'), { ssr: false });
import { ArtifactPane, DedupBadge } from './Artifact';
import LeftRail from './LeftRail';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import MobileDetails from './MobileDetails';
import { UNKNOWN_HOLDER, MuseumGroup } from './reviewMapUtils';

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

export default function ReviewMap({ artifacts, wikidataHits }: Props) {
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
    filteredArtifacts,
    focusedCoords,
    selected,
    selectedIndex,
    handleSelectMuseum,
    handleNextArtifact,
    handlePreviousArtifact,
    primarySource,
    previewImage,
    previewTitle,
    takenFromLabel,
    currentLocationLabel,
    responsibleLabel,
  } = useReviewMapState(artifacts, wikidataHits);

  return (
    <div className="flex h-screen bg-navy flex-col md:flex-row">
      <LeftRail
        museumGroups={museumGroups}
        artifacts={artifacts}
        selectedMuseum={selectedMuseum}
        onSelectMuseum={handleSelectMuseum}
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
        artifacts={artifacts}
        onClose={() => setMobileMenuOpen(false)}
        onSelectMuseum={(name) => { handleSelectMuseum(name); setMobileMenuOpen(false); }}
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

