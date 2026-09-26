'use client';
import { Drawer } from 'vaul';
import type { ArtifactCard } from '@/lib/types';
import type { SheetAction, SheetState } from '../sheetNav';
import { SNAP_POINTS, sheetHiddenPx, snapToVaul, vaulToSnap } from '../sheetGeometry';
import { holderKeyOf, type MuseumGroup } from '../reviewMapUtils';
import SheetHoldersList from './SheetHoldersList';
import SheetHolderArtifacts from './SheetHolderArtifacts';
import SheetArtifactView from './SheetArtifactView';

export interface MobileSheetProps {
  sheet: SheetState;
  dispatch: (action: SheetAction) => void;
  museumGroups: MuseumGroup[];
  visibleArtifacts: ArtifactCard[];
  selected: ArtifactCard | null;
  previewTitle: string | null;
  previewImage: string | undefined;
  selectedIndex: number;
  scopeCount: number;
  wikidataUrl: string | null;
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
  onStep: (dir: 1 | -1) => void;
  viewportHeight: number;
}

export default function MobileSheet({
  sheet,
  dispatch,
  museumGroups,
  visibleArtifacts,
  selected,
  previewTitle,
  previewImage,
  selectedIndex,
  scopeCount,
  wikidataUrl,
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
  onStep,
  viewportHeight,
}: MobileSheetProps) {
  const { view } = sheet;
  const back = () => dispatch({ type: 'back' });
  const iconBtn =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded text-lg text-parchment active:bg-navy/60';

  let title: string;
  if (view.level === 'holders') {
    title = `${museumGroups.length} holders · ${visibleArtifacts.length} artifacts`;
  } else if (view.level === 'holder') {
    title = view.holderKey;
  } else {
    title = previewTitle ?? selected?.title ?? 'Artifact';
  }

  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snapToVaul(sheet.snap)}
      setActiveSnapPoint={(v) => dispatch({ type: 'setSnap', snap: vaulToSnap(v) })}
    >
      <Drawer.Portal>
        <Drawer.Content
          aria-describedby={undefined}
          className="lg:hidden fixed inset-x-0 bottom-0 z-1001 flex h-full flex-col rounded-t-2xl border-t border-navy-border bg-navy-light shadow-[0_-12px_40px_rgba(0,0,0,0.45)] outline-none"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-parchment-dim/40" aria-hidden="true" />

          <div className="flex h-14 shrink-0 items-center gap-1 px-2">
            {view.level !== 'holders' && (
              <button type="button" aria-label="Back" onClick={back} className={iconBtn}>
                ←
              </button>
            )}
            <Drawer.Title className="flex-1 truncate px-2 font-heading text-lg text-parchment">
              {title}
            </Drawer.Title>
            {view.level === 'artifact' && scopeCount > 0 && (
              <div className="flex shrink-0 items-center">
                <button type="button" aria-label="Previous artifact" onClick={() => onStep(-1)} className={iconBtn}>
                  ‹
                </button>
                <span className="min-w-12 text-center text-xs tabular-nums text-parchment-dim">
                  {selectedIndex + 1} / {scopeCount}
                </span>
                <button type="button" aria-label="Next artifact" onClick={() => onStep(1)} className={iconBtn}>
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-navy-border/60">
            {view.level === 'holders' && (
              <SheetHoldersList
                museumGroups={museumGroups}
                onOpenHolder={(holderKey) => dispatch({ type: 'openHolder', holderKey })}
              />
            )}
            {view.level === 'holder' && (
              <SheetHolderArtifacts
                artifacts={visibleArtifacts.filter((a) => holderKeyOf(a) === view.holderKey)}
                onOpenArtifact={(wpId) => dispatch({ type: 'openArtifact', wpId, holderKey: view.holderKey })}
              />
            )}
            {view.level === 'artifact' && (
              <SheetArtifactView
                selected={selected}
                previewTitle={previewTitle}
                previewImage={previewImage}
                wikidataUrl={wikidataUrl}
                takenFromLabel={takenFromLabel}
                currentLocationLabel={currentLocationLabel}
                responsibleLabel={responsibleLabel}
                onStep={onStep}
              />
            )}
            {/* vaul slides the full-height sheet partly off-screen; keep the last rows reachable. */}
            <div aria-hidden="true" style={{ height: sheetHiddenPx(sheet.snap, viewportHeight) }} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
