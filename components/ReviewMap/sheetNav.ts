/**
 * Navigation state for the mobile bottom sheet: which level is showing and how
 * far the sheet is pulled up. Pure — no React, no DOM — so the rules that keep
 * the sheet, the review session and browser history in step are testable.
 */

export type SheetSnap = 'peek' | 'half' | 'full';

export type SheetView =
  | { level: 'holders' }
  | { level: 'holder'; holderKey: string }
  | { level: 'artifact'; wpId: string; holderKey: string | null };

export interface SheetState {
  view: SheetView;
  snap: SheetSnap;
}

export type SheetAction =
  | { type: 'openHolder'; holderKey: string }
  | { type: 'openArtifact'; wpId: string; holderKey: string | null }
  | { type: 'showArtifact'; wpId: string }
  | { type: 'showHolders'; open?: boolean }
  | { type: 'setSnap'; snap: SheetSnap }
  | { type: 'back' };

const HOLDERS: SheetView = { level: 'holders' };

export function initSheet(initialWpId: string | null): SheetState {
  if (initialWpId) {
    return { view: { level: 'artifact', wpId: initialWpId, holderKey: null }, snap: 'half' };
  }
  return { view: HOLDERS, snap: 'peek' };
}

/** Drilling in from a collapsed sheet should reveal what you drilled into. */
function raised(snap: SheetSnap): SheetSnap {
  return snap === 'peek' ? 'half' : snap;
}

export function reduceSheet(state: SheetState, action: SheetAction): SheetState {
  switch (action.type) {
    case 'openHolder':
      return { view: { level: 'holder', holderKey: action.holderKey }, snap: raised(state.snap) };
    case 'openArtifact':
      return {
        view: { level: 'artifact', wpId: action.wpId, holderKey: action.holderKey },
        snap: raised(state.snap),
      };
    case 'showArtifact':
      if (state.view.level !== 'artifact' || state.view.wpId === action.wpId) return state;
      return { ...state, view: { ...state.view, wpId: action.wpId } };
    case 'showHolders':
      return { view: HOLDERS, snap: action.open ? raised(state.snap) : state.snap };
    case 'setSnap':
      return state.snap === action.snap ? state : { ...state, snap: action.snap };
    case 'back': {
      const { view } = state;
      if (view.level === 'artifact') {
        return {
          ...state,
          view: view.holderKey ? { level: 'holder', holderKey: view.holderKey } : HOLDERS,
        };
      }
      if (view.level === 'holder') return { ...state, view: HOLDERS };
      if (state.snap !== 'peek') return { ...state, snap: 'peek' };
      return state;
    }
  }
}

function levelDepth(view: SheetView): number {
  if (view.level === 'holders') return 0;
  if (view.level === 'holder') return 1;
  return view.holderKey ? 2 : 1;
}

/**
 * How many Back presses it takes to reach the collapsed root. Mirrored into
 * browser history so the phone's Back gesture steps through the sheet.
 */
export function sheetDepth(state: SheetState): number {
  return levelDepth(state.view) + (state.snap === 'peek' ? 0 : 1);
}

/** The holder focus and selection the review session should hold for a view. */
export function sessionTargetFor(view: SheetView): { holderKey: string | null; wpId: string | null } {
  if (view.level === 'holders') return { holderKey: null, wpId: null };
  if (view.level === 'holder') return { holderKey: view.holderKey, wpId: null };
  return { holderKey: view.holderKey, wpId: view.wpId };
}

/**
 * What tapping a map pin does on mobile. Pins group by coordinates, not holder,
 * so one pin can span several holders — returned artifacts are all pinned at
 * Addis Ababa whoever holds them. Those open the holders list instead.
 */
export function resolveMarkerTap(pins: { wpId: string; holderKey: string }[]): SheetAction | null {
  if (pins.length === 0) return null;
  if (pins.length === 1) return { type: 'openArtifact', wpId: pins[0].wpId, holderKey: pins[0].holderKey };
  const holderKey = pins[0].holderKey;
  if (pins.every((p) => p.holderKey === holderKey)) return { type: 'openHolder', holderKey };
  return { type: 'showHolders', open: true };
}
