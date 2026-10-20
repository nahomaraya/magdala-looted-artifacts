# Review Session Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the four `components/ReviewMap/` state hooks into one pure `reviewSession` module behind a thin React adapter, fixing two live map bugs in the process.

**Architecture:** `reviewSession.ts` is a pure module — `initSession`, `reduce`, `derive`, no React. `useReviewSession` is a `useReducer` + `useMemo` adapter over it with no logic of its own. Presentation derivations and mobile drawer state leave the session entirely. Camera precedence deliberately stays inside the Leaflet effect (see ADR-0001), driven by a `focusToken` the session emits.

**Tech Stack:** Next.js 16.2.3, React 19.2.4, TypeScript 5, Tailwind 4, react-leaflet 5, Vitest (added in Task 8).

**Spec:** `docs/review-session-deepening.md`

## Global Constraints

- **Do not change `ArtifactCard`** in `lib/types.ts`. Downstream components depend on its shape.
- **Do not touch `lib/dedup.ts` or the data layer's `returned` field.** Those belong to separate candidates.
- **No visual redesign.** Markup and Tailwind classes carry over verbatim unless a prop rename forces an edit.
- **Domain term is `holder`**, never `museum` or `institution`. See `CONTEXT.md`.
- **`UNKNOWN_HOLDER` value stays exactly `'Unknown / Unresolved'`.** It is a join key; changing it silently regroups the rail.
- **This plan is refactor-first, tests-last** by explicit decision. Tasks 1–7 verify with `npx tsc --noEmit`, `npm run build`, and the stated manual check. Task 8 adds Vitest.
- Every task ends with a commit. Commit messages end with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

---

### Task 1: Shared repatriation module

**Files:**
- Create: `lib/repatriation.ts`
- Modify: `components/ReviewMap/reviewMapUtils.ts` (remove `isReturnedArtifact`, re-export from the new module)
- Modify: `components/ReviewMap/ReviewMapLeaflet.tsx:9,16-19` (remove `artifactCoords`, import `displayCoords`)

**Interfaces:**
- Produces: `isReturned(card: ArtifactCard): boolean`, `displayCoords(card: ArtifactCard): [number, number] | undefined` from `@/lib/repatriation`. Tasks 2 and 6 both consume these.

- [ ] **Step 1: Create `lib/repatriation.ts`**

Bodies move verbatim from `reviewMapUtils.isReturnedArtifact` and `ReviewMapLeaflet.artifactCoords`. No behaviour change in this task.

```ts
import { ADDIS_ABABA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';

const RETURNED_CATEGORY_PATTERN = /returned\s+plunder/i;
const ETHIOPIA_HOLDER_PATTERN = /national\s+museum\s+of\s+ethiopia/i;

/**
 * An artifact counts as returned to Ethiopia when ANY of these hold:
 *   - the data layer's `returned` flag is set;
 *   - it carries the source-site "Returned plunder" category;
 *   - any holder is the National Museum of Ethiopia.
 * The latter two are the reliable signals since the boolean is only sparsely
 * filled in. We scan every holder (not just the primary one) because the
 * Ethiopian holder often lacks a QID and so isn't chosen as the map pin's
 * primary holder.
 */
export function isReturned(card: ArtifactCard): boolean {
  if (card.returned) return true;
  if (
    card.allCategories.some(
      (c) => RETURNED_CATEGORY_PATTERN.test(c.name) || RETURNED_CATEGORY_PATTERN.test(c.rawName),
    )
  ) {
    return true;
  }
  if (card.where && ETHIOPIA_HOLDER_PATTERN.test(card.where)) return true;
  return card.allHolders.some(
    (h) => ETHIOPIA_HOLDER_PATTERN.test(h.name) || ETHIOPIA_HOLDER_PATTERN.test(h.rawName),
  );
}

/**
 * Where an artifact sits on the map. Returned artifacts default to the National
 * Museum of Ethiopia in Addis Ababa, overriding whatever their prior holder
 * resolved to; everything else uses its holder's coordinates.
 *
 * This is the single coords function: pins, the Magdala polyline and the
 * camera fly-to all call it, so they cannot disagree.
 */
export function displayCoords(card: ArtifactCard): [number, number] | undefined {
  if (isReturned(card)) return ADDIS_ABABA_COORDS;
  return card.holder?.coords;
}
```

- [ ] **Step 2: Point `reviewMapUtils.ts` at the new module**

Delete the `isReturnedArtifact` function, both regex constants and its doc comment from `reviewMapUtils.ts`, then add a re-export so existing importers keep compiling this task:

```ts
export { isReturned as isReturnedArtifact } from '@/lib/repatriation';
```

- [ ] **Step 3: Point `ReviewMapLeaflet.tsx` at the new module**

Delete `artifactCoords` (lines 11–19) and the `isReturnedArtifact` import (line 9). Add:

```ts
import { displayCoords } from '@/lib/repatriation';
```

Replace all three `artifactCoords(` call sites with `displayCoords(`: `groupByCoords` (line 64), the controller effect (line 103), and `selectedCoords` (line 116). `ADDIS_ABABA_COORDS` is no longer used in this file — remove it from the `@/lib/constants` import, leaving `MAGDALA_COORDS`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: all clean. No behaviour change yet — this task only moves code.

- [ ] **Step 5: Commit**

```bash
git add lib/repatriation.ts components/ReviewMap/reviewMapUtils.ts components/ReviewMap/ReviewMapLeaflet.tsx
git commit -m "refactor: extract isReturned and displayCoords into lib/repatriation

One coords function for pins, polyline and camera.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: The pure review session module

**Files:**
- Create: `components/ReviewMap/reviewSession.ts`

**Interfaces:**
- Consumes: `isReturned` from `@/lib/repatriation` (Task 1).
- Produces: `UNKNOWN_HOLDER`, `HolderGroup`, `SessionState`, `SessionAction`, `SessionView`, `initSession`, `reduce`, `derive`. Task 3 consumes all of them; Task 8 tests them.

Nothing imports this module yet. It must compile standalone.

- [ ] **Step 1: Create `components/ReviewMap/reviewSession.ts`**

```ts
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
      // Rule 7: the focus token moves only here, so the map can tell "a holder
      // was just picked" from steady state.
      const next: SessionState = {
        ...state,
        holder: action.name,
        focusToken: state.focusToken + 1,
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
```

- [ ] **Step 2: Verify it compiles standalone**

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean. `reviewSession.ts` has no importers yet, so `npm run build` output is unchanged.

- [ ] **Step 3: Commit**

```bash
git add components/ReviewMap/reviewSession.ts
git commit -m "feat: add pure reviewSession module

Three functions and two type unions replace 29 returned values.
No React, no setters.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Adapter, wiring, and deletion of the four hooks

This is the task that actually deepens the cluster. It is large because the swap has to be atomic — the four hooks cannot be half-deleted.

**Files:**
- Create: `components/ReviewMap/useReviewSession.ts`
- Modify: `components/ReviewMap/index.tsx` (whole component body)
- Modify: `components/ReviewMap/LeftRail.tsx` (props renamed; stops filtering internally)
- Modify: `components/ReviewMap/MobileMenu.tsx`, `MobileDetails.tsx` (prop renames only)
- Delete: `components/ReviewMap/useReviewMapState.ts`, `useArtifactNav.ts`, `useVisibleArtifacts.ts`, `useMuseumFilter.ts`

**Interfaces:**
- Consumes: everything Task 2 produces.
- Produces: `useReviewSession(artifacts, pinnedWpId): readonly [SessionView, Dispatch<SessionAction>]`.

- [ ] **Step 1: Create the adapter**

```ts
'use client';

import { useMemo, useReducer } from 'react';
import type { ArtifactCard } from '@/lib/types';
import {
  derive,
  initSession,
  reduce,
  type SessionAction,
  type SessionState,
  type SessionView,
} from './reviewSession';

/**
 * Thin React binding over the pure reviewSession module. Deliberately holds no
 * logic of its own: everything worth testing lives in reviewSession.ts.
 */
export function useReviewSession(artifacts: ArtifactCard[], pinnedWpId: string | null) {
  const [state, dispatch] = useReducer(
    (s: SessionState, a: SessionAction) => reduce(s, a, artifacts, pinnedWpId),
    null,
    () => initSession(artifacts, pinnedWpId),
  );

  const view: SessionView = useMemo(
    () => derive(state, artifacts, pinnedWpId),
    [state, artifacts, pinnedWpId],
  );

  return [view, dispatch] as const;
}
```

- [ ] **Step 2: Rewrite `index.tsx`'s component body**

Replace the 30-line destructure (lines 25–55) with two lines, and rewrite the JSX props. Keep every Tailwind class exactly as it is; only the expressions change. Mobile drawer state stays as local `useState` in this task — Task 4 moves it out.

```tsx
export default function ReviewMap({ artifacts, wikidataHits, initialSelectedWpId = null }: Props) {
  const [view, dispatch] = useReviewSession(artifacts, initialSelectedWpId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const goNext = () => { dispatch({ t: 'next' }); setMobileDetailsOpen(true); setMobileMenuOpen(false); };
  const goPrev = () => { dispatch({ t: 'prev' }); setMobileDetailsOpen(true); setMobileMenuOpen(false); };
```

Add `import { useState } from 'react';` and `import { useReviewSession } from './useReviewSession';`, and remove the `useReviewMapState` import.

Prop expressions become:

| Child | Prop changes |
|---|---|
| `LeftRail` | `holderGroups={view.holderGroups}` `artifacts={view.filtered}` `visibleCount={view.visible.length}` `selectedHolder={view.holder}` `selectedWpId={view.selected?.wpId ?? null}` `onSelectHolder={(name) => dispatch({ t: 'selectHolder', name })}` `onSelectArtifact={(wpId) => dispatch({ t: 'selectArtifact', wpId })}` |
| `MobileHeader` | `onNext={goNext}` `onPrev={goPrev}`; `previewTitle` stays for now (Task 5 replaces it) |
| `MobileMenu` | `holderGroups={view.holderGroups}` `artifacts={view.filtered}` `onSelectHolder={(name) => { dispatch({ t: 'selectHolder', name }); setMobileMenuOpen(false); }}` `showWeakLink={view.showWeakLink}` `onToggleWeakLink={() => dispatch({ t: 'toggleWeakLink' })}` `showReturnedOnly={view.showReturnedOnly}` `onToggleReturnedOnly={() => dispatch({ t: 'toggleReturnedOnly' })}` `returnedCount={view.returnedCount}` |
| `MobileDetails` | `selected={view.selected}` `selectedIndex={view.selectedIndex}` `count={view.filtered.length}` `selectedHolder={view.holder}` `onNext={goNext}` `onPrev={goPrev}` |
| `ReviewMapLeaflet` | `artifacts={view.filtered}` `selectedWpId={view.selected?.wpId ?? null}` `onSelect={(wpId) => dispatch({ t: 'selectArtifact', wpId })}` `focusCoords={null}` — leave `focusCoords` wired to `null` in this task; Task 6 replaces it with `focusToken` |
| `ArtifactPane` | unchanged in this task except `selected={view.selected}`, `selectedIndex={view.selectedIndex}`, `filteredArtifacts={view.filtered}`, `selectedMuseum={view.holder}`, `handleNextArtifact={goNext}`, `handlePreviousArtifact={goPrev}`. Task 5 cuts it to 4 props. |

The two desktop toggle buttons (lines 117–145) change their handlers to `dispatch({ t: 'toggleReturnedOnly' })` and `dispatch({ t: 'toggleWeakLink' })`, and read `view.showReturnedOnly` / `view.showWeakLink` / `view.returnedCount`.

- [ ] **Step 3: Update `LeftRail.tsx`**

Rename props and delete the internal filter — it is the third copy of that predicate and `view.filtered` already did the work.

```tsx
import type { ArtifactCard } from '@/lib/types';
import type { HolderGroup } from './reviewSession';

export default function LeftRail({
  holderGroups,
  artifacts,
  visibleCount,
  selectedHolder,
  selectedWpId,
  onSelectHolder,
  onSelectArtifact,
}: {
  holderGroups: HolderGroup[];
  artifacts: ArtifactCard[];
  visibleCount: number;
  selectedHolder: string | null;
  selectedWpId: string | null;
  onSelectHolder: (name: string | null) => void;
  onSelectArtifact: (wpId: string) => void;
}) {
```

In the header (line 25), use the honest in-scope count and the domain term:

```tsx
{holderGroups.length} holders · {visibleCount} artifacts
```

In the selected-holder branch, replace `artifacts.filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === selectedMuseum).map(...)` with plain `artifacts.map(...)`. Remove the now-unused `UNKNOWN_HOLDER` import. Rename `selectedMuseum` → `selectedHolder`, `museumGroups` → `holderGroups`, `onSelectMuseum` → `onSelectHolder` throughout.

- [ ] **Step 4: Update `MobileMenu.tsx` and `MobileDetails.tsx` prop names**

`MobileMenu`: `museumGroups` → `holderGroups`, `onSelectMuseum` → `onSelectHolder`, `showWeakLinkArtifacts` → `showWeakLink`, `onToggleWeakLinkArtifacts` → `onToggleWeakLink`; import `HolderGroup` from `./reviewSession` instead of `MuseumGroup` from `./reviewMapUtils`.

`MobileDetails`: `filteredArtifacts: ArtifactCard[]` → `count: number` (it only read `.length`), `selectedMuseum` → `selectedHolder`. Update the counter line to `{selectedIndex + 1} / {count}`.

- [ ] **Step 5: Delete the four hooks**

```bash
git rm components/ReviewMap/useReviewMapState.ts \
       components/ReviewMap/useArtifactNav.ts \
       components/ReviewMap/useVisibleArtifacts.ts \
       components/ReviewMap/useMuseumFilter.ts
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: clean. If `tsc` reports an unresolved `useReviewMapState` import, a consumer was missed — grep for it: `grep -rn "useReviewMapState\|selectedMuseum\|museumGroups" components app`.

- [ ] **Step 7: Manual check**

```bash
npm run dev
```

Visit `http://localhost:3000/review`. Confirm: the rail lists holders with counts; clicking a holder narrows the list and selects its first artifact; Next/Previous wrap; both toggles work and "show weak link" is disabled while "returned only" is on; the rail header count matches the pane's `n / total`.

- [ ] **Step 8: Commit**

```bash
git add -A components/ReviewMap
git commit -m "refactor: replace four ReviewMap hooks with useReviewSession

29 returned values -> one SessionView. Deletes the imperative/reactive
selection race and the third copy of the holder filter predicate.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Move mobile drawer state out of the session

**Files:**
- Create: `components/ReviewMap/useDrawers.ts`
- Modify: `components/ReviewMap/index.tsx`

**Interfaces:**
- Produces: `useDrawers(): { menuOpen, detailsOpen, toggleMenu, openDetails, closeAll }`.

- [ ] **Step 1: Create `useDrawers.ts`**

```ts
'use client';

import { useCallback, useState } from 'react';

/**
 * Mobile drawer state. Deliberately separate from the review session: a
 * desktop reader has no drawers, and the session has no opinion about them.
 */
export function useDrawers() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((s) => !s), []);
  const openDetails = useCallback(() => {
    setDetailsOpen(true);
    setMenuOpen(false);
  }, []);
  const closeAll = useCallback(() => {
    setDetailsOpen(false);
    setMenuOpen(false);
  }, []);

  return { menuOpen, detailsOpen, toggleMenu, openDetails, closeAll, setMenuOpen };
}
```

- [ ] **Step 2: Use it in `index.tsx`**

Replace the two `useState` calls from Task 3 with `const drawers = useDrawers();`. Rewrite:

```tsx
const goNext = () => { dispatch({ t: 'next' }); drawers.openDetails(); };
const goPrev = () => { dispatch({ t: 'prev' }); drawers.openDetails(); };
```

`MobileHeader`: `onToggleMenu={drawers.toggleMenu}` `onOpenDetails={drawers.openDetails}`.
`MobileMenu`: `mobileMenuOpen={drawers.menuOpen}` `onClose={() => drawers.setMenuOpen(false)}` and the holder handler becomes `(name) => { dispatch({ t: 'selectHolder', name }); drawers.setMenuOpen(false); }`.
`MobileDetails`: `mobileDetailsOpen={drawers.detailsOpen}` `onClose={drawers.closeAll}`.

Remove the now-unused `useState` import.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 4: Manual check**

In dev, narrow the browser to mobile width. Confirm the menu opens and closes, Next/Previous opens the details sheet and closes the menu, and the details close button shuts both.

- [ ] **Step 5: Commit**

```bash
git add components/ReviewMap/useDrawers.ts components/ReviewMap/index.tsx
git commit -m "refactor: move mobile drawer state out of the review session

Drawer booleans were 4 of useArtifactNav's 9 exported values.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Presentation module; cut ArtifactPane from 13 props to 4

**Files:**
- Create: `components/Artifact/presentation.ts`
- Modify: `components/Artifact/ArtifactPane.tsx`, `ArtifactHeader.tsx`, `ArtifactActions.tsx`, `ProvenanceReferences.tsx`
- Modify: `components/ReviewMap/index.tsx`, `MobileHeader.tsx`, `MobileDetails.tsx`

**Interfaces:**
- Consumes: `ReviewWikidataHit` (still in `reviewMapUtils.ts` until Task 7).
- Produces: `presentation(card, hits): Presentation`, `TAKEN_FROM`, and `labelForSourceUrl` re-homed here.

- [ ] **Step 1: Create `components/Artifact/presentation.ts`**

```ts
import type { ArtifactCard } from '@/lib/types';
import type { ReviewWikidataHit } from '../ReviewMap/reviewMapUtils';
import { UNKNOWN_HOLDER } from '../ReviewMap/reviewSession';

/** Every artifact in this project was taken in the same event. */
export const TAKEN_FROM = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';

export type Presentation = {
  title: string;
  image: string | undefined;
  primarySource: string | null;
  wikidataUrl: string | null;
  currentLocation: string;
  responsible: string | null;
};

/** Everything one artifact needs in order to be displayed. Pure. */
export function presentation(
  card: ArtifactCard,
  hits: Record<string, ReviewWikidataHit>,
): Presentation {
  const hit = card.dedup.method === 'p973' && card.dedup.qid ? hits[card.dedup.qid] : undefined;
  return {
    title: hit?.label ?? card.title,
    image: hit?.imageUrl ?? card.imageUrls[0],
    primarySource: card.sourceLinks[0] ?? card.url ?? null,
    wikidataUrl:
      hit?.wikidataUrl ??
      (card.dedup.qid ? `https://www.wikidata.org/wiki/${card.dedup.qid}` : null),
    currentLocation: card.where ?? card.holder?.name ?? 'Unknown',
    responsible:
      card.holder?.name && card.holder.name !== UNKNOWN_HOLDER ? card.holder.name : null,
  };
}

const REFERENCE_DOMAIN_LABELS: Record<string, string> = {
  // moved verbatim from reviewMapUtils.ts — do not re-order or edit entries
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

export function labelForSourceUrl(url: string): string {
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
```

- [ ] **Step 2: Rewrite `ArtifactPane.tsx`**

```tsx
'use client';
import type { ArtifactCard } from '@/lib/types';
import type { ReviewWikidataHit } from '../ReviewMap/reviewMapUtils';
import { presentation } from './presentation';
import ArtifactHeader from './ArtifactHeader';
import ArtifactActions from './ArtifactActions';
import ArtifactMetadata from './ArtifactMetadata';
import ProvenanceReferences from './ProvenanceReferences';

type ArtifactPaneProps = {
  selected: ArtifactCard | null;
  hits: Record<string, ReviewWikidataHit>;
  position: { index: number; count: number; holder: string | null };
  onNext: () => void;
  onPrev: () => void;
};

export function ArtifactPane({ selected, hits, position, onNext, onPrev }: ArtifactPaneProps) {
  if (!selected) {
    return (
      <aside className="hidden md:block w-185 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
        <div className="p-6 text-base text-parchment-dim">No artifact selected.</div>
      </aside>
    );
  }

  const p = presentation(selected, hits);

  return (
    <aside className="hidden md:block w-185 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
      <div className="p-6 xl:p-8 space-y-6">
        <ArtifactHeader selected={selected} presentation={p} position={position} />
        <ArtifactActions presentation={p} onNext={onNext} onPrev={onPrev} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <ArtifactMetadata selected={selected} />
          </div>
          <div className="space-y-4">
            <ProvenanceReferences selected={selected} presentation={p} />
          </div>
        </div>
      </div>
    </aside>
  );
}
```

Note the leading space before `'use client'` on the original line 1 is removed.

- [ ] **Step 3: Update the three leaf components**

`ArtifactHeader.tsx` — props become `{ selected: ArtifactCard; presentation: Presentation; position: { index: number; count: number; holder: string | null } }`. The counter line becomes:

```tsx
WP #{selected.wpId} · {position.index + 1} / {position.count}
{position.holder && <span className="ml-1 opacity-70">in {position.holder}</span>}
```

and the title/image use `presentation.title` and `presentation.image`.

`ArtifactActions.tsx` — props become `{ presentation: Presentation; onNext: () => void; onPrev: () => void }`; read `presentation.wikidataUrl` and `presentation.primarySource`; the two buttons call `onNext` / `onPrev`.

`ProvenanceReferences.tsx` — props become `{ selected: ArtifactCard; presentation: Presentation }`. Replace `takenFromLabel` with the imported `TAKEN_FROM`, `currentLocationLabel` with `presentation.currentLocation`, `responsibleLabel` with `presentation.responsible`. Change its `labelForSourceUrl` import from `'../ReviewMap/reviewMapUtils'` to `'./presentation'`.

- [ ] **Step 4: Update the callers**

`index.tsx`:

```tsx
<ArtifactPane
  selected={view.selected}
  hits={wikidataHits}
  position={{ index: view.selectedIndex, count: view.filtered.length, holder: view.holder }}
  onNext={goNext}
  onPrev={goPrev}
/>
```

`MobileHeader` and `MobileDetails` previously received `previewTitle` / `previewImage` computed in the session. Give them `selected` and `hits` and let them call `presentation` themselves, matching `ArtifactPane`.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 6: Manual check**

In dev, confirm the pane still shows title, image, the `n / total` counter, "in {holder}", the Wikidata/source button, provenance labels and the reference list — and that the mobile header/details show the same title.

- [ ] **Step 7: Commit**

```bash
git add components/Artifact components/ReviewMap/index.tsx components/ReviewMap/MobileHeader.tsx components/ReviewMap/MobileDetails.tsx
git commit -m "refactor: extract artifact presentation module

ArtifactPane 13 props -> 4. takenFromLabel stops being drilled 4 levels.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Wire `focusToken` into the map effect — fixes both bugs

**Files:**
- Modify: `components/ReviewMap/ReviewMapLeaflet.tsx:23-31,76-110,112`
- Modify: `components/ReviewMap/index.tsx` (pass `focusToken` and the focused holder's coords)

**Interfaces:**
- Consumes: `view.focusToken`, `view.filtered`, `displayCoords` (Task 1).

- [ ] **Step 1: Change `ReviewMapLeaflet`'s props**

```ts
interface Props {
  artifacts: ArtifactCard[];
  wikidataHits: Partial<Record<string, { label: string }>>;
  selectedWpId: string | null;
  onSelect: (wpId: string) => void;
  /** Changes only when a holder is picked. A change means "fly to the holder
   *  once"; an unchanged token means the camera should frame the selection. */
  focusToken: number;
}
```

Delete the `focusCoords` prop and the `focusKey` line (88).

- [ ] **Step 2: Rewrite `ReviewMapController`**

```tsx
function ReviewMapController({
  artifacts,
  selectedWpId,
  focusToken,
}: {
  artifacts: ArtifactCard[];
  selectedWpId: string | null;
  focusToken: number;
}) {
  const map = useMap();
  const seenToken = useRef(focusToken);

  useEffect(() => {
    // A holder was just picked: fly to it once. Without this token the effect
    // could not tell a fresh pick from steady state, so every artifact click
    // flew back to the holder.
    if (focusToken !== seenToken.current) {
      seenToken.current = focusToken;
      const first = artifacts.find((a) => displayCoords(a));
      const coords = first ? displayCoords(first) : undefined;
      if (coords) {
        map.flyTo(coords, 7, { duration: 1 });
        return;
      }
    }

    if (!selectedWpId) {
      map.flyTo(MAGDALA_COORDS, 3, { duration: 0.8 });
      return;
    }

    const selected = artifacts.find((a) => a.wpId === selectedWpId);
    const coords = selected ? displayCoords(selected) : undefined;
    if (!coords) return;
    map.flyToBounds(L.latLngBounds([MAGDALA_COORDS, coords]), {
      padding: [70, 70],
      duration: 1,
    });
  }, [artifacts, map, selectedWpId, focusToken]);

  return null;
}
```

`artifacts` here is `view.filtered`, so "the first artifact with coordinates" is the first of the picked holder's artifacts — and it goes through `displayCoords`, so a repatriated holder flies to Addis Ababa where its pins are. That is bug 2.

Add `useRef` to the React import and remove the `eslint-disable-line` comment — the dependency array is now honest.

- [ ] **Step 3: Update the call sites in this file and `index.tsx`**

In `ReviewMapLeaflet`, pass `focusToken` through to the controller and drop `focusCoords` from the component signature. In `index.tsx`, replace `focusCoords={null}` with `focusToken={view.focusToken}`.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: Manual check — this is the bug verification**

In dev at `/review`:
1. Click a holder in the rail. The map flies to it at zoom 7. ✓
2. Click an artifact in that holder's list. **The camera frames that artifact against Magdala and does NOT fly back to the holder.** (Bug 1 fixed.)
3. Click several artifacts in a row. The camera follows each one.
4. Pick a holder whose artifacts are returned (any whose pins render in Addis Ababa). **The camera flies to Addis Ababa, not to the original holder's city.** (Bug 2 fixed.)

- [ ] **Step 6: Commit**

```bash
git add components/ReviewMap/ReviewMapLeaflet.tsx components/ReviewMap/index.tsx
git commit -m "fix: stop the holder fly-to shadowing artifact selection

focusToken makes the holder fly-to genuinely one-shot, and the camera now
shares displayCoords with the pins so the two cannot disagree.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Dissolve `reviewMapUtils.ts`; strip the unreachable `'fuzzy'` branch

**Files:**
- Create: `components/ReviewMap/reviewMapTypes.ts`
- Modify: `components/ReviewMap/ReviewMapLeaflet.tsx` (delete the duplicated `getStatus`)
- Modify: `components/ReviewMap/index.tsx`, `app/review/page.tsx`, `components/Artifact/presentation.ts`, `ArtifactPane.tsx` (import sites)
- Delete: `components/ReviewMap/reviewMapUtils.ts`

**Interfaces:**
- Produces: `ReviewStatus`, `getReviewStatus`, `ReviewWikidataHit` from `./reviewMapTypes`.

`'fuzzy'` is unreachable: both live call sites of `getArtifacts` pass `skipDedup: true`, so no card is ever built with `dedup.method === 'fuzzy'`.

- [ ] **Step 1: Create `reviewMapTypes.ts`**

```ts
import type { ArtifactCard } from '@/lib/types';

/** 'fuzzy' removed: dedup is skipped on every live call path, so a card can
 *  never carry that method. See docs/review-session-deepening.md §2. */
export type ReviewStatus = 'already' | 'new';

export function getReviewStatus(card: ArtifactCard): ReviewStatus {
  if (card.dedup.method === 'p973' && card.dedup.qid) return 'already';
  return 'new';
}

export interface ReviewWikidataHit {
  qid: string;
  label: string;
  imageUrl?: string;
  wikidataUrl: string;
}
```

- [ ] **Step 2: Delete the duplicate in `ReviewMapLeaflet.tsx`**

Remove the local `type ReviewStatus` (line 21) and `getStatus` (lines 39–43). Import instead:

```ts
import { getReviewStatus, type ReviewStatus } from './reviewMapTypes';
```

Update `statusColor` and `pickGroupStatus` to drop the `'fuzzy'` arm:

```ts
function statusColor(status: ReviewStatus): string {
  return status === 'already' ? '#9ca3af' : '#3b82f6';
}

function pickGroupStatus(cards: ArtifactCard[]): ReviewStatus {
  const counts: Record<ReviewStatus, number> = { already: 0, new: 0 };
  for (const card of cards) counts[getReviewStatus(card)] += 1;
  return counts.already >= counts.new ? 'already' : 'new';
}
```

- [ ] **Step 3: Repoint the remaining importers and delete the file**

`index.tsx` and `app/review/page.tsx` import `ReviewWikidataHit` — change the source to `./reviewMapTypes` (and `@/components/ReviewMap/reviewMapTypes` respectively). Same for `presentation.ts` and `ArtifactPane.tsx`.

```bash
grep -rn "reviewMapUtils" components app     # expect: no matches after edits
git rm components/ReviewMap/reviewMapUtils.ts
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 5: Manual check**

In dev, confirm map pins still render and are grey (`already`) or blue (`new`). No amber pins should appear — that was the unreachable state.

- [ ] **Step 6: Commit**

```bash
git add -A components app
git commit -m "refactor: dissolve reviewMapUtils; drop unreachable 'fuzzy' status

getStatus was byte-identical to getReviewStatus in the same folder. dedup
is skipped on every live path, so 'fuzzy' could never occur.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Vitest, and tests at the session's interface

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `components/ReviewMap/reviewSession.test.ts`

**Interfaces:**
- Consumes: everything Task 2 produces.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

`environment: 'node'` is deliberate: the session module has no DOM dependency, and keeping it that way is the point of the refactor.

- [ ] **Step 3: Write the tests**

```ts
import { describe, expect, it } from 'vitest';
import type { ArtifactCard, ResolvedHolder } from '@/lib/types';
import { derive, initSession, reduce, UNKNOWN_HOLDER } from './reviewSession';

function card(over: Partial<ArtifactCard> & { wpId: string }): ArtifactCard {
  return {
    slug: '', url: `https://example.com/${over.wpId}`, title: `Artifact ${over.wpId}`,
    weakLink: false, imageUrls: [], sourceLinks: ['https://example.com/src'],
    holder: null, allHolders: [], primaryCategory: null, allCategories: [],
    maqdalaConfidence: null, isReviewable: true,
    dedup: { exists: true, qid: 'Q1', method: 'p973', confidence: 100 },
    ...over,
  } as ArtifactCard;
}

// ResolvedHolder.coords is REQUIRED (lib/types.ts:92), so it needs a default.
// 'wikidata' is a valid QidSource (lib/types.ts:64) — the read path uses it.
const holder = (
  name: string,
  qid: string | null = null,
  coords: [number, number] = [51.5194, -0.127],
): ResolvedHolder => ({ name, qid, rawName: name, coords, source: 'wikidata' });

const A = card({ wpId: 'a', holder: holder('British Museum', 'Q6373') });
const B = card({ wpId: 'b', holder: holder('British Museum', 'Q6373') });
const C = card({ wpId: 'c', holder: holder('British Library', 'Q23308') });
const WEAK = card({ wpId: 'w', weakLink: true, holder: holder('British Museum', 'Q6373') });
const NO_SRC = card({ wpId: 'n', sourceLinks: [], holder: holder('British Library', 'Q23308') });
const RETURNED = card({ wpId: 'r', returned: true, holder: holder('National Museum of Ethiopia') });

const ALL = [A, B, C, WEAK, NO_SRC, RETURNED];

describe('visibility (rule 1)', () => {
  it('hides weak links and source-less artifacts by default', () => {
    const v = derive(initSession(ALL, null), ALL, null);
    expect(v.visible.map((a) => a.wpId)).toEqual(['a', 'b', 'c', 'r']);
  });

  it('shows everything when weak links are on', () => {
    const s = reduce(initSession(ALL, null), { t: 'toggleWeakLink' }, ALL, null);
    expect(derive(s, ALL, null).visible).toHaveLength(6);
  });

  it('returned-only wins over weak-link and ignores source links', () => {
    let s = reduce(initSession(ALL, null), { t: 'toggleWeakLink' }, ALL, null);
    s = reduce(s, { t: 'toggleReturnedOnly' }, ALL, null);
    expect(derive(s, ALL, null).visible.map((a) => a.wpId)).toEqual(['r']);
  });

  it('counts returned artifacts independently of the filters', () => {
    expect(derive(initSession(ALL, null), ALL, null).returnedCount).toBe(1);
  });
});

describe('the deep-link pin (rule 2)', () => {
  it('shows a pinned weak link that the filters would hide', () => {
    const v = derive(initSession(ALL, 'w'), ALL, 'w');
    expect(v.visible.map((a) => a.wpId)).toContain('w');
    expect(v.selected?.wpId).toBe('w');
  });

  it('survives a filter change', () => {
    const s = reduce(initSession(ALL, 'w'), { t: 'toggleWeakLink' }, ALL, 'w');
    expect(derive(s, ALL, 'w').visible.map((a) => a.wpId)).toContain('w');
  });

  it('dies once the user picks another artifact', () => {
    const s = reduce(initSession(ALL, 'w'), { t: 'selectArtifact', wpId: 'a' }, ALL, 'w');
    expect(derive(s, ALL, 'w').visible.map((a) => a.wpId)).not.toContain('w');
  });
});

describe('holder groups and filtering (rules 3, 4)', () => {
  it('groups by holder name and sorts by count descending', () => {
    const v = derive(initSession(ALL, null), ALL, null);
    expect(v.holderGroups.map((g) => [g.name, g.count])).toEqual([
      ['British Museum', 2], ['British Library', 1], ['National Museum of Ethiopia', 1],
    ]);
  });

  it('files a holder-less artifact under UNKNOWN_HOLDER', () => {
    const orphan = card({ wpId: 'o' });
    const v = derive(initSession([orphan], null), [orphan], null);
    expect(v.holderGroups[0].name).toBe(UNKNOWN_HOLDER);
  });

  it('narrows to the selected holder', () => {
    const s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    expect(derive(s, ALL, null).filtered.map((a) => a.wpId)).toEqual(['a', 'b']);
  });
});

describe('selection reset (rule 5)', () => {
  it('selects the first artifact of the newly picked holder', () => {
    const s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Library' }, ALL, null);
    expect(derive(s, ALL, null).selected?.wpId).toBe('c');
  });

  it('never leaves a selection outside the filtered list', () => {
    let s = reduce(initSession(ALL, null), { t: 'selectArtifact', wpId: 'c' }, ALL, null);
    s = reduce(s, { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    const v = derive(s, ALL, null);
    expect(v.selectedIndex).toBeGreaterThanOrEqual(0);
    expect(v.filtered.map((a) => a.wpId)).toContain(v.selected?.wpId);
  });
});

describe('navigation (rule 6)', () => {
  it('wraps forward past the end', () => {
    let s = reduce(initSession(ALL, null), { t: 'selectArtifact', wpId: 'r' }, ALL, null);
    s = reduce(s, { t: 'next' }, ALL, null);
    expect(derive(s, ALL, null).selected?.wpId).toBe('a');
  });

  it('wraps backward past the start', () => {
    let s = reduce(initSession(ALL, null), { t: 'selectArtifact', wpId: 'a' }, ALL, null);
    s = reduce(s, { t: 'prev' }, ALL, null);
    expect(derive(s, ALL, null).selected?.wpId).toBe('r');
  });

  it('is a no-op on an empty list', () => {
    const s = initSession([], null);
    expect(reduce(s, { t: 'next' }, [], null)).toEqual(s);
  });
});

describe('the focus token (rule 7)', () => {
  it('bumps when a holder is picked', () => {
    const s0 = initSession(ALL, null);
    const s1 = reduce(s0, { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    expect(s1.focusToken).toBe(s0.focusToken + 1);
  });

  it('does NOT bump when an artifact is picked', () => {
    // This is bug 1: an artifact click must not re-trigger the holder fly-to.
    let s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    const afterHolder = s.focusToken;
    s = reduce(s, { t: 'selectArtifact', wpId: 'b' }, ALL, null);
    expect(s.focusToken).toBe(afterHolder);
  });

  it('does NOT bump on navigation or toggles', () => {
    let s = reduce(initSession(ALL, null), { t: 'next' }, ALL, null);
    expect(s.focusToken).toBe(0);
    s = reduce(s, { t: 'toggleWeakLink' }, ALL, null);
    expect(s.focusToken).toBe(0);
  });
});

describe('empty holders (rule 8)', () => {
  it('clears a holder that no longer has visible artifacts', () => {
    const weakOnly = [card({ wpId: 'x', weakLink: true, holder: holder('Tiny Museum') }), A];
    let s = reduce(initSession(weakOnly, null), { t: 'toggleWeakLink' }, weakOnly, null);
    s = reduce(s, { t: 'selectHolder', name: 'Tiny Museum' }, weakOnly, null);
    expect(s.holder).toBe('Tiny Museum');
    s = reduce(s, { t: 'toggleWeakLink' }, weakOnly, null);   // hide weak links again
    expect(s.holder).toBeNull();
  });
});
```

- [ ] **Step 4: Run the tests**

```bash
npm test
```

Expected: all pass. If `selection reset` or `empty holders` fail, the bug is in `reduce`, not the test — re-read rules 5 and 8 in the spec.

- [ ] **Step 5: Verify the whole build is still clean**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts components/ReviewMap/reviewSession.test.ts
git commit -m "test: add vitest and cover the review session interface

Rules 1-8 asserted through initSession/reduce/derive. No DOM, no Leaflet.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage.** §4 target structure → Tasks 1, 2, 3, 4, 5, 7. §5 interface → Tasks 1, 2, 5, 7. §5 rules 1–8 → Task 2 implements, Task 8 asserts. §6 prop changes → Tasks 3, 5, 6. §7 renames → Task 3. §3 bug 1 → Task 6. §3 bug 2 → Tasks 1 + 6. §8 acceptance → the manual checks in Tasks 3, 4, 5, 6, 7 plus Task 8's suite. No gaps.

**Known deviation from the skill's default.** The skill's task template is red-green TDD. This plan is refactor-first by explicit decision (spec §2), so Tasks 1–7 verify with typecheck, build and a stated manual check, and Task 8 adds the runner and the suite. The consequence is recorded rather than hidden: bugs 1 and 2 are verified by hand in Task 6 and only regression-guarded from Task 8 onward.

**Type consistency.** `SessionView` field names used in Tasks 3, 5 and 6 (`visible`, `filtered`, `holderGroups`, `selected`, `selectedIndex`, `holder`, `showWeakLink`, `showReturnedOnly`, `returnedCount`, `focusToken`) match Task 2's definition. `displayCoords` / `isReturned` (Task 1) are used under those exact names in Tasks 2 and 6. `Presentation` (Task 5) is consumed under that name by all three leaf components. `HolderGroup` (Task 2) is consumed by `LeftRail` and `MobileMenu` in Task 3. `getReviewStatus` (Task 7) replaces `getStatus` at every call site in the same task.

**Ordering note.** `presentation.ts` (Task 5) imports `ReviewWikidataHit` from `reviewMapUtils` because Task 7 has not run yet; Task 7 repoints it. This is deliberate — it keeps each task's build green.
