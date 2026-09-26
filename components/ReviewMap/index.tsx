'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ArtifactCard } from '@/lib/types';
import { useReviewMapState } from './useReviewMapState';
import { useLayoutMode } from './useLayoutMode';
import { useMobileSheet } from './useMobileSheet';
import { useSheetHistory } from './useSheetHistory';
import { resolveMarkerTap, sessionTargetFor, sheetDepth, type SheetView } from './sheetNav';
import { sheetInsetPx } from './sheetGeometry';

const ReviewMapLeaflet = dynamic(() => import('./ReviewMapLeaflet'), { ssr: false });
import { ArtifactPane } from '../Artifact';
import LeftRail from './LeftRail';
import MobileTopBar from './mobile/MobileTopBar';
import MapFilterChips from './mobile/MapFilterChips';
import MobileSheet from './mobile/MobileSheet';
import { holderKeyOf, type ReviewWikidataHit } from './reviewMapUtils';

export type { ReviewWikidataHit };

interface Props {
  artifacts: ArtifactCard[];
  wikidataHits: Record<string, ReviewWikidataHit>;
  initialSelectedWpId?: string | null;
}

export default function ReviewMap({ artifacts, wikidataHits, initialSelectedWpId = null }: Props) {
  const mode = useLayoutMode();
  const compact = mode === 'compact';
  const {
    selectedWpId,
    setSelectedWpId,
    selectedMuseum,
    museumGroups,
    visibleArtifacts,
    filteredArtifacts,
    focusedCoords,
    selected,
    selectedIndex,
    handleSelectMuseum,
    wikidataUrl,
    stepArtifact,
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
  } = useReviewMapState(artifacts, wikidataHits, initialSelectedWpId, mode);

  // Every sheet transition moves the review session in the same batch, so the
  // sheet and the session can't disagree about holder focus or selection.
  const applySheetView = useCallback(
    (view: SheetView) => {
      const { holderKey, wpId } = sessionTargetFor(view);
      if (holderKey !== selectedMuseum) handleSelectMuseum(holderKey);
      setSelectedWpId(wpId);
    },
    [selectedMuseum, handleSelectMuseum, setSelectedWpId],
  );
  const { sheet, dispatch } = useMobileSheet(initialSelectedWpId, applySheetView);
  const goBack = useCallback(() => dispatch({ type: 'back' }), [dispatch]);
  useSheetHistory(sheetDepth(sheet), goBack, compact);

  const stepInSheet = (dir: 1 | -1) => {
    const wpId = stepArtifact(dir);
    if (wpId) dispatch({ type: 'showArtifact', wpId });
  };

  const handleMarkerTap = (group: ArtifactCard[]) => {
    const action = resolveMarkerTap(group.map((a) => ({ wpId: a.wpId, holderKey: holderKeyOf(a) })));
    if (action) dispatch(action);
  };

  // A filter change can take the open artifact or holder out of scope; on
  // mobile, fall back to the holders list at the current sheet height.
  const toggleReturnedOnly = () => {
    setShowReturnedOnly((s) => !s);
    if (compact) dispatch({ type: 'showHolders' });
  };
  const toggleWeakLinks = () => {
    setShowWeakLinkArtifacts((s) => !s);
    if (compact) dispatch({ type: 'showHolders' });
  };

  // 1024–1279px: the artifact pane can slide away; picking an artifact brings it back.
  const [paneCollapsed, setPaneCollapsed] = useState(false);
  const selectOnWide = (wpId: string) => {
    setPaneCollapsed(false);
    setSelectedWpId(wpId);
  };

  const viewportHeight = compact ? window.innerHeight : 0;
  const bottomInset = compact ? sheetInsetPx(sheet.snap, viewportHeight) : 0;

  return (
    <div className="flex h-dvh bg-navy flex-col lg:flex-row">
      <MobileTopBar />

      <LeftRail
        museumGroups={museumGroups}
        artifacts={visibleArtifacts}
        selectedMuseum={selectedMuseum}
        selectedWpId={selectedWpId}
        onSelectMuseum={handleSelectMuseum}
        onSelectArtifact={selectOnWide}
      />

      {/* Compact: lift Leaflet's bottom controls (OSM attribution) above the 96px peek bar. */}
      <div className={`flex-1 min-w-0 relative ${compact ? 'compact-map' : ''}`}>
        <ReviewMapLeaflet
          artifacts={filteredArtifacts}
          wikidataHits={wikidataHits}
          selectedWpId={selectedWpId}
          onSelect={selectOnWide}
          focusCoords={focusedCoords}
          compact={compact}
          onMarkerTap={handleMarkerTap}
          bottomInset={bottomInset}
        />

        <MapFilterChips
          showReturnedOnly={showReturnedOnly}
          onToggleReturnedOnly={toggleReturnedOnly}
          returnedCount={returnedCount}
          showWeakLinkArtifacts={showWeakLinkArtifacts}
          onToggleWeakLinkArtifacts={toggleWeakLinks}
        />

        {paneCollapsed && (
          <button
            type="button"
            onClick={() => setPaneCollapsed(false)}
            aria-label="Show artifact pane"
            className="hidden lg:block xl:hidden absolute bottom-6 right-3 z-1000 rounded bg-navy/80 px-3 py-1.5 text-xs text-parchment shadow backdrop-blur-sm hover:bg-navy"
          >
            « Artifact
          </button>
        )}

        <div className="hidden lg:flex absolute top-3 right-3 z-1000 flex-col items-end gap-2 group">
          <Link
            href="/library"
            className="rounded bg-gold px-3 py-1.5 text-xs font-semibold text-navy shadow transition-colors hover:bg-gold-light"
          >
            View library
          </Link>
          <button
            type="button"
            onClick={toggleReturnedOnly}
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
            onClick={toggleWeakLinks}
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
        wikidataUrl={wikidataUrl}
        handleNextArtifact={handleNextArtifact}
        handlePreviousArtifact={handlePreviousArtifact}
        takenFromLabel={takenFromLabel}
        currentLocationLabel={currentLocationLabel}
        responsibleLabel={responsibleLabel}
        collapsed={paneCollapsed}
        onToggleCollapsed={() => setPaneCollapsed((c) => !c)}
      />

      {compact && (
        <MobileSheet
          sheet={sheet}
          dispatch={dispatch}
          museumGroups={museumGroups}
          visibleArtifacts={visibleArtifacts}
          selected={selected}
          previewTitle={previewTitle ?? null}
          previewImage={previewImage}
          selectedIndex={selectedIndex}
          scopeCount={filteredArtifacts.length}
          wikidataUrl={wikidataUrl}
          takenFromLabel={takenFromLabel}
          currentLocationLabel={currentLocationLabel}
          responsibleLabel={responsibleLabel}
          onStep={stepInSheet}
          viewportHeight={viewportHeight}
        />
      )}
    </div>
  );
}
