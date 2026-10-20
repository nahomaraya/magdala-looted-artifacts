import type { ArtifactCard } from '@/lib/types';
import { isReturned } from '@/lib/repatriation';

export const UNKNOWN_HOLDER = 'Unknown / Unresolved';

export type HolderGroup = {
  key: string;
  name: string;
  qid: string | null;
  count: number;
};

export type SessionState = {
  showWeakLink: boolean;
  showReturnedOnly: boolean;
  holder: string | null;
  selectedWpId: string | null;
  /** False until the user moves off the deep-linked artifact. Gates the pin. */
  hasNavigated: boolean;
  /** Bumped only by selectHolder. The map's one-shot fly-to signal. */
  focusToken: number;
};

export type SessionAction =
  | { t: 'toggleWeakLink' }
  | { t: 'toggleReturnedOnly' }
  | { t: 'selectHolder'; name: string | null }
  | { t: 'selectArtifact'; wpId: string }
  | { t: 'next' }
  | { t: 'prev' };

export type SessionView = {
  visible: ArtifactCard[];
  holderGroups: HolderGroup[];
  filtered: ArtifactCard[];
  selected: ArtifactCard | null;
  selectedIndex: number;
  holder: string | null;
  showWeakLink: boolean;
  showReturnedOnly: boolean;
  returnedCount: number;
  focusToken: number;
};

function holderKey(card: ArtifactCard): string {
  return card.holder?.name ?? UNKNOWN_HOLDER;
}

/** Rule 1 (visibility) + rule 2 (the deep-link pin). */
function visibleFor(
  state: SessionState,
  artifacts: ArtifactCard[],
  pinnedWpId: string | null,
): ArtifactCard[] {
  const pinActive = !state.hasNavigated && pinnedWpId !== null;
  return artifacts.filter((a) => {
    if (pinActive && a.wpId === pinnedWpId) return true;
    // Returned-only is an exclusive mode: it shows every returned artifact
    // regardless of weak-link / source-link status.
    if (state.showReturnedOnly) return isReturned(a);
    if (state.showWeakLink) return true;
    return !a.weakLink && a.sourceLinks.length > 0;
  });
}

/** Rule 4 (holder narrowing). */
function filteredFor(state: SessionState, visible: ArtifactCard[]): ArtifactCard[] {
  if (!state.holder) return visible;
  return visible.filter((a) => holderKey(a) === state.holder);
}

/** Rule 3 (holder groups). */
function groupHolders(visible: ArtifactCard[]): HolderGroup[] {
  const groups = new Map<string, HolderGroup>();
  for (const card of visible) {
    const name = holderKey(card);
    const existing = groups.get(name);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(name, { key: name, name, qid: card.holder?.qid ?? null, count: 1 });
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** Rule 8: a holder that no longer has visible artifacts stops being selected. */
function settleHolder(
  state: SessionState,
  artifacts: ArtifactCard[],
  pinnedWpId: string | null,
): SessionState {
  if (!state.holder) return state;
  const visible = visibleFor(state, artifacts, pinnedWpId);
  const stillThere = visible.some((a) => holderKey(a) === state.holder);
  return stillThere ? state : { ...state, holder: null };
}

/** Rule 5: after any filter change the selection resets to the new first item. */
function resetSelection(
  state: SessionState,
  artifacts: ArtifactCard[],
  pinnedWpId: string | null,
): string | null {
  const next = filteredFor(state, visibleFor(state, artifacts, pinnedWpId));
  return next[0]?.wpId ?? null;
}

export function initSession(
  artifacts: ArtifactCard[],
  pinnedWpId: string | null,
): SessionState {
  const base: SessionState = {
    showWeakLink: false,
    showReturnedOnly: false,
    holder: null,
    selectedWpId: pinnedWpId,
    hasNavigated: false,
    focusToken: 0,
  };
  // With a deep link the pin IS the selection. Without one, start on the first
  // visible artifact (what useArtifactNav used to default to).
  if (pinnedWpId) return base;
  return { ...base, selectedWpId: resetSelection(base, artifacts, null) };
}

export function reduce(
  state: SessionState,
  action: SessionAction,
  artifacts: ArtifactCard[],
  pinnedWpId: string | null,
): SessionState {
  switch (action.t) {
    case 'toggleWeakLink': {
      const next = settleHolder(
        { ...state, showWeakLink: !state.showWeakLink },
        artifacts,
        pinnedWpId,
      );
      return { ...next, selectedWpId: resetSelection(next, artifacts, pinnedWpId) };
    }
    case 'toggleReturnedOnly': {
      const next = settleHolder(
        { ...state, showReturnedOnly: !state.showReturnedOnly },
        artifacts,
        pinnedWpId,
      );
      return { ...next, selectedWpId: resetSelection(next, artifacts, pinnedWpId) };
    }
    case 'selectHolder': {
      // Rule 7: the focus token moves only when a holder is picked, so the map
      // can tell "a holder was just picked" from steady state. Clearing the
      // holder is not a pick.
      const next: SessionState = {
        ...state,
        holder: action.name,
        focusToken: action.name === null ? state.focusToken : state.focusToken + 1,
      };
      return { ...next, selectedWpId: resetSelection(next, artifacts, pinnedWpId) };
    }
    case 'selectArtifact':
      return { ...state, selectedWpId: action.wpId, hasNavigated: true };
    case 'next':
    case 'prev': {
      // Rule 6: wrapping navigation; an unfound selection lands on index 0.
      const list = filteredFor(state, visibleFor(state, artifacts, pinnedWpId));
      if (list.length === 0) return state;
      const i = list.findIndex((a) => a.wpId === state.selectedWpId);
      const step = action.t === 'next' ? 1 : -1;
      const nextIndex = i < 0 ? 0 : (i + step + list.length) % list.length;
      return { ...state, selectedWpId: list[nextIndex].wpId, hasNavigated: true };
    }
  }
}

export function derive(
  state: SessionState,
  artifacts: ArtifactCard[],
  pinnedWpId: string | null,
): SessionView {
  const visible = visibleFor(state, artifacts, pinnedWpId);
  const filtered = filteredFor(state, visible);
  const selectedIndex = filtered.findIndex((a) => a.wpId === state.selectedWpId);
  return {
    visible,
    holderGroups: groupHolders(visible),
    filtered,
    selected: selectedIndex >= 0 ? filtered[selectedIndex] : null,
    selectedIndex,
    holder: state.holder,
    showWeakLink: state.showWeakLink,
    showReturnedOnly: state.showReturnedOnly,
    // Independent of the current filters — it labels the toggle.
    returnedCount: artifacts.filter(isReturned).length,
    focusToken: state.focusToken,
  };
}
