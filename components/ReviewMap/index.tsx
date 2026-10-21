'use client';

import type { Dispatch } from 'react';
import dynamic from 'next/dynamic';
import type { SessionAction, SessionView } from './reviewSession';
import type { ViewId } from '../StoryMap/views';
import { useDrawers } from './useDrawers';

const DispersalMap = dynamic(() => import('./DispersalMap'), { ssr: false });
import { ArtifactPane } from '../Artifact';
import LeftRail from './LeftRail';
import MobileHeader from './MobileHeader';
import MobileMenu from './MobileMenu';
import MobileDetails from './MobileDetails';
interface Props {
  view: SessionView;
  dispatch: Dispatch<SessionAction>;
  // Only the mobile menu needs these, to list the Views above the holders.
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
}

export default function ReviewMap({ view, dispatch, activeView, onSelectView }: Props) {
  const drawers = useDrawers();

  const goNext = () => { dispatch({ t: 'next' }); drawers.openDetails(); };
  const goPrev = () => { dispatch({ t: 'prev' }); drawers.openDetails(); };

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
        selected={view.selected}
        onToggleMenu={drawers.toggleMenu}
        onOpenDetails={drawers.openDetails}
        onNext={goNext}
        onPrev={goPrev}
      />

      <MobileMenu
        mobileMenuOpen={drawers.menuOpen}
        holderGroups={view.holderGroups}
        artifacts={view.filtered}
        onClose={() => drawers.setMenuOpen(false)}
        activeView={activeView}
        onSelectView={(id) => { onSelectView(id); drawers.setMenuOpen(false); }}
        onSelectHolder={(name) => { dispatch({ t: 'selectHolder', name }); drawers.setMenuOpen(false); }}
        showWeakLink={view.showWeakLink}
        onToggleWeakLink={() => dispatch({ t: 'toggleWeakLink' })}
        showReturnedOnly={view.showReturnedOnly}
        onToggleReturnedOnly={() => dispatch({ t: 'toggleReturnedOnly' })}
        returnedCount={view.returnedCount}
      />

      <MobileDetails
        mobileDetailsOpen={drawers.detailsOpen}
        selected={view.selected}
        selectedIndex={view.selectedIndex}
        count={view.filtered.length}
        selectedHolder={view.holder}
        onClose={drawers.closeAll}
        onNext={goNext}
        onPrev={goPrev}
      />

      <div className="flex-1 min-w-0 relative">
        <DispersalMap
          artifacts={view.filtered}
          selectedWpId={view.selected?.wpId ?? null}
          onSelect={(wpId) => dispatch({ t: 'selectArtifact', wpId })}
          focusToken={view.focusToken}
        />
        <div className="hidden md:flex absolute top-3 right-3 z-1000 flex-col items-end gap-2 group">
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
        selected={view.selected}
        position={{ index: view.selectedIndex, count: view.filtered.length, holder: view.holder }}
        onNext={goNext}
        onPrev={goPrev}
      />
    </div>
  );
}

