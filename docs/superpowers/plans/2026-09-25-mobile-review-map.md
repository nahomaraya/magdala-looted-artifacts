# Mobile Review Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the review map's full-screen mobile overlays with a map-first layout and a draggable, drill-in bottom sheet, and fix the tablet range so the map is never crushed.

**Architecture:** The sheet's navigation (which level, which snap) is a pure reducer in `sheetNav.ts`, unit-tested with Vitest. Every sheet transition goes through one `dispatch` that also pushes the result into the existing review-session hooks (`useReviewMapState`), so the sheet and the session can never disagree. A tiny `useSheetHistory` hook mirrors the sheet's depth into browser history so the phone's Back gesture steps back one level. Layout switches on one media query (`min-width: 64rem`, Tailwind's `lg`); CSS breakpoints handle visibility, and a `useLayoutMode` hook handles the few behaviours that differ (selection policy, marker taps, camera inset).

**Tech Stack:** Next.js 16.2.3, React 19.2.4, TypeScript 5, Tailwind 4, react-leaflet 5, vaul 1.1.2 (new), Vitest 5 (new, dev only).

**Spec:** The agreed design summary below (from the grilling session on 2026-09-25) — there is no separate spec file.

> **Agreed design.** Map only (`/`); the Library is untouched.
> - **< 1024px:** map fills the screen under a slim top bar; a `vaul` bottom sheet snaps to peek / half / full. Portrait phones 360–430px are the target; landscape only has to stay usable (sheet height is capped).
> - **1024–1279px:** three columns; the artifact pane is ~420px with a » collapse toggle; it reopens when you select an artifact.
> - **≥ 1280px:** current desktop layout, unchanged.
> - **Sheet:** one drill-in sheet: holders → a holder's artifacts (weak links highlighted) → artifact details. ← steps up; leaving a holder clears holder focus and zooms out. The phone's Back steps back one level (artifact → holder list → holders → peek) instead of leaving the site.
> - **First load:** sheet at peek (`N holders · M artifacts`), nothing selected on mobile. `?wpId=` opens the sheet at half on that artifact. Desktop still pre-selects the first artifact.
> - **Artifact view (essentials):** title, image, holder, provenance (taken from, current location, responsible institution), Wikidata link, "Open primary source ↗" button (no embedded preview). No categories, no references list, no theprinceandtheplunder.com post.
> - **Prev/next:** swipe the artifact card left/right, plus ‹ › buttons and an `n / total` counter. Scope is the holder in focus, or everything in scope when no holder is focused.
> - **Marker tap (mobile):** no Leaflet tooltip; the sheet jumps to that holder's artifacts, or straight to the artifact if there's only one.
> - **Camera:** fly-to accounts for the sheet's height so the selected marker isn't hidden behind it. ADR-0001's manual checks apply.
> - **Controls:** Returned / Weak-link filters become pill chips over the top of the map; the library link is an icon in the top bar.
> - `MobileHeader`, `MobileMenu`, `MobileDetails` are deleted.

## Global Constraints

- **Domain term is `holder`**, never `museum` or `institution`, in new code, props, and copy. See `CONTEXT.md`. (Existing names like `selectedMuseum` / `handleSelectMuseum` / `MuseumGroup` stay — renaming them is out of scope.)
- **`UNKNOWN_HOLDER` stays exactly `'Unknown / Unresolved'`.** It is the holder join key.
- **Do not change `ArtifactCard`** in `lib/types.ts`, the data layer, or anything under `app/library` / `components/Library`.
- **Desktop at ≥ 1280px must look and behave exactly as today** (left rail, 736px pane, top-right buttons, tooltips, first-artifact pre-selection).
- **Breakpoint:** the one boundary is `lg` = `64rem` = 1024px. JS uses `(min-width: 64rem)`; CSS uses `lg:`. The pane's mid width is `lg:w-105` (420px); the desktop pane stays `xl:w-184`.
- **Sheet snap points:** peek `'96px'`, half `0.5`, full `0.92` (fractions of viewport height, as vaul expects).
- **Camera stays in the Leaflet effect** (ADR-0001). The sheet only supplies a bottom inset in pixels; it never calls `flyTo` itself.
- **No new `setState`-in-`useEffect`.** The repo's lint config (`react-hooks/set-state-in-effect`) already flags the existing ones; don't add more.
- **Tests:** pure modules get Vitest tests (`*.test.ts`, `environment: 'node'`). React components are verified with `npx tsc --noEmit`, `npm run build`, and the manual checks stated in each task. Baseline `npm run lint` already has 2 errors in `useArtifactNav.ts` / `useMuseumFilter.ts`; new files must add none.
- **Relation to `docs/superpowers/plans/2026-09-14-review-session-deepening.md`:** that plan is not implemented on `main`. This plan builds on the current hooks. It removes `mobileMenuOpen` / `mobileDetailsOpen` from `useArtifactNav`, which the deepening plan also removes — if that plan lands later, `sheetNav.ts` / `useMobileSheet.ts` stay as they are and only `ReviewMap/index.tsx`'s `applySheetView` needs re-pointing at the new session API.
- Every task ends with a commit. Commit messages end with:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`

## Review Focus

1. **Returned-only mode + marker tap.** Every returned artifact is pinned at Addis Ababa regardless of its holder, so one pin holds several holders. Tapping it must open the holders list (which in that mode is exactly those holders), not pretend the pin is one holder. Pinned by `resolveMarkerTap` "mixed holders" test in Task 1.
2. **Toggling a filter chip while an artifact is open on mobile.** The artifact (or its holder) may leave scope. Expect the sheet to fall back to the holders list at its current height, with no stale title and no history entries left behind. Pinned by the `showHolders` keeps-snap test in Task 1 and the chip handler in Task 7.
3. **Dragging the sheet (peek ↔ half ↔ full) must not re-fly the map.** Only a change of holder focus or selection moves the camera; the inset is read at fly time, not a dependency. Manual check in Task 6.
4. **Back gesture after an in-sheet ← tap.** In-sheet ← and the phone's Back must stay in lockstep — no double-back, no leaving the site early. Pinned by the `sheetDepth` decrements-by-one tests in Task 1; manual check in Task 7.
5. **Collapsing the mid-width pane changes the map's width without a window resize.** Leaflet must re-measure (grey tiles otherwise). Handled by a `ResizeObserver` in Task 6; manual check in Task 7.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `vitest.config.ts` | Create | Vitest config, `@` alias, node env |
| `components/ReviewMap/sheetNav.ts` | Create | Pure sheet state: levels, snaps, depth, back, marker-tap resolution, session target |
| `components/ReviewMap/sheetNav.test.ts` | Create | Tests for the above |
| `components/ReviewMap/sheetGeometry.ts` | Create | Pure: vaul snap mapping, camera inset px, swipe classification |
| `components/ReviewMap/sheetGeometry.test.ts` | Create | Tests for the above |
| `components/ReviewMap/selection.ts` | Create | Pure: `reconcileSelection`, `stepIndex` |
| `components/ReviewMap/selection.test.ts` | Create | Tests for the above |
| `components/ReviewMap/useLayoutMode.ts` | Create | `'compact' \| 'wide' \| null` from one media query |
| `components/ReviewMap/useMobileSheet.ts` | Create | React adapter over `sheetNav` with a view-change callback |
| `components/ReviewMap/useSheetHistory.ts` | Create | Mirrors sheet depth into `history` |
| `components/ReviewMap/useArtifactNav.ts` | Modify | Derive selection via `reconcileSelection`; drop mobile flags; add `stepArtifact` |
| `components/ReviewMap/useReviewMapState.ts` | Modify | Thread `mode` into `useArtifactNav` |
| `components/ReviewMap/reviewMapUtils.ts` | Modify | Add `holderKeyOf` |
| `components/Artifact/ProvenanceSummary.tsx` | Create | Provenance block, extracted from `ProvenanceReferences` |
| `components/Artifact/ProvenanceReferences.tsx` | Modify | Use `ProvenanceSummary` |
| `components/ReviewMap/mobile/MobileTopBar.tsx` | Create | Slim top bar + library icon link |
| `components/ReviewMap/mobile/MapFilterChips.tsx` | Create | Returned / Weak-link pill toggles |
| `components/ReviewMap/mobile/MobileSheet.tsx` | Create | vaul shell: handle, level header, body switch |
| `components/ReviewMap/mobile/SheetHoldersList.tsx` | Create | Holders level |
| `components/ReviewMap/mobile/SheetHolderArtifacts.tsx` | Create | One holder's artifacts level |
| `components/ReviewMap/mobile/SheetArtifactView.tsx` | Create | Essentials artifact view + swipe |
| `components/ReviewMap/ReviewMapLeaflet.tsx` | Modify | `compact`, `onMarkerTap`, `bottomInset`, `ResizeObserver`, `ZoomControl` |
| `components/Artifact/ArtifactPane.tsx` | Modify | `lg:w-105 xl:w-184`, collapse toggle |
| `components/ReviewMap/LeftRail.tsx` | Modify | `hidden lg:block` |
| `components/ReviewMap/index.tsx` | Modify | Wire everything; `applySheetView` |
| `components/ReviewMap/MobileHeader.tsx`, `MobileMenu.tsx`, `MobileDetails.tsx` | Delete | Replaced |

---

### Task 1: Vitest + pure sheet navigation

**Files:**
- Create: `vitest.config.ts`
- Create: `components/ReviewMap/sheetNav.ts`
- Test: `components/ReviewMap/sheetNav.test.ts`
- Modify: `package.json` (scripts, devDependency)

**Interfaces:**
- Produces (from `components/ReviewMap/sheetNav.ts`):
  - `type SheetSnap = 'peek' | 'half' | 'full'`
  - `type SheetView = { level: 'holders' } | { level: 'holder'; holderKey: string } | { level: 'artifact'; wpId: string; holderKey: string | null }`
  - `interface SheetState { view: SheetView; snap: SheetSnap }`
  - `type SheetAction = { type: 'openHolder'; holderKey: string } | { type: 'openArtifact'; wpId: string; holderKey: string | null } | { type: 'showArtifact'; wpId: string } | { type: 'showHolders'; open?: boolean } | { type: 'setSnap'; snap: SheetSnap } | { type: 'back' }`
  - `initSheet(initialWpId: string | null): SheetState`
  - `reduceSheet(state: SheetState, action: SheetAction): SheetState` — returns the **same object** when nothing changes
  - `sheetDepth(state: SheetState): number`
  - `sessionTargetFor(view: SheetView): { holderKey: string | null; wpId: string | null }`
  - `resolveMarkerTap(pins: { wpId: string; holderKey: string }[]): SheetAction | null`

- [ ] **Step 1: Install Vitest and add scripts**

```bash
npm install -D vitest@^5
```

In `package.json` `"scripts"`, add after `"lint"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['**/*.test.ts'], exclude: ['node_modules/**', '.next/**'] },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 3: Write the failing tests**

`components/ReviewMap/sheetNav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  initSheet,
  reduceSheet,
  resolveMarkerTap,
  sessionTargetFor,
  sheetDepth,
  type SheetState,
} from './sheetNav';

const holders: SheetState = { view: { level: 'holders' }, snap: 'peek' };

describe('initSheet', () => {
  it('starts collapsed on the holders list', () => {
    expect(initSheet(null)).toEqual({ view: { level: 'holders' }, snap: 'peek' });
  });

  it('opens a deep-linked artifact at half height with no holder focus', () => {
    expect(initSheet('42')).toEqual({
      view: { level: 'artifact', wpId: '42', holderKey: null },
      snap: 'half',
    });
  });
});

describe('reduceSheet', () => {
  it('openHolder drills in and raises a peeking sheet to half', () => {
    expect(reduceSheet(holders, { type: 'openHolder', holderKey: 'British Museum' })).toEqual({
      view: { level: 'holder', holderKey: 'British Museum' },
      snap: 'half',
    });
  });

  it('openHolder keeps a full sheet full', () => {
    const full: SheetState = { ...holders, snap: 'full' };
    expect(reduceSheet(full, { type: 'openHolder', holderKey: 'X' }).snap).toBe('full');
  });

  it('openArtifact drills in and raises to half', () => {
    expect(reduceSheet(holders, { type: 'openArtifact', wpId: '7', holderKey: 'X' })).toEqual({
      view: { level: 'artifact', wpId: '7', holderKey: 'X' },
      snap: 'half',
    });
  });

  it('showArtifact swaps the artifact in place, keeping holder and snap', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'full' };
    expect(reduceSheet(s, { type: 'showArtifact', wpId: '8' })).toEqual({
      view: { level: 'artifact', wpId: '8', holderKey: 'X' },
      snap: 'full',
    });
  });

  it('showArtifact is a no-op outside the artifact level', () => {
    expect(reduceSheet(holders, { type: 'showArtifact', wpId: '8' })).toBe(holders);
  });

  it('showHolders keeps the current snap by default (filter chip toggle)', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'peek' };
    expect(reduceSheet(s, { type: 'showHolders' })).toEqual({ view: { level: 'holders' }, snap: 'peek' });
  });

  it('showHolders with open raises to half (mixed-holder pin tap)', () => {
    expect(reduceSheet(holders, { type: 'showHolders', open: true }).snap).toBe('half');
  });

  it('back from an artifact with a holder returns to that holder', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'half' };
    expect(reduceSheet(s, { type: 'back' })).toEqual({
      view: { level: 'holder', holderKey: 'X' },
      snap: 'half',
    });
  });

  it('back from a deep-linked artifact (no holder) returns to holders', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: null }, snap: 'half' };
    expect(reduceSheet(s, { type: 'back' }).view).toEqual({ level: 'holders' });
  });

  it('back from a holder returns to holders', () => {
    const s: SheetState = { view: { level: 'holder', holderKey: 'X' }, snap: 'full' };
    expect(reduceSheet(s, { type: 'back' })).toEqual({ view: { level: 'holders' }, snap: 'full' });
  });

  it('back on an open holders list collapses to peek', () => {
    const s: SheetState = { view: { level: 'holders' }, snap: 'half' };
    expect(reduceSheet(s, { type: 'back' })).toEqual(holders);
  });

  it('back at the root is a no-op', () => {
    expect(reduceSheet(holders, { type: 'back' })).toBe(holders);
  });

  it('setSnap to the current snap is a no-op', () => {
    expect(reduceSheet(holders, { type: 'setSnap', snap: 'peek' })).toBe(holders);
  });
});

describe('sheetDepth', () => {
  it('is 0 at the collapsed root', () => {
    expect(sheetDepth(holders)).toBe(0);
  });

  it('counts an open sheet plus each drill-in level', () => {
    expect(sheetDepth({ view: { level: 'holders' }, snap: 'half' })).toBe(1);
    expect(sheetDepth({ view: { level: 'holder', holderKey: 'X' }, snap: 'half' })).toBe(2);
    expect(sheetDepth({ view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'full' })).toBe(3);
    expect(sheetDepth({ view: { level: 'artifact', wpId: '7', holderKey: null }, snap: 'half' })).toBe(2);
  });

  it('dropping to peek does not hide the level depth', () => {
    expect(sheetDepth({ view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'peek' })).toBe(2);
  });

  it('every non-root back reduces depth by exactly one', () => {
    const states: SheetState[] = [
      { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'full' },
      { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'peek' },
      { view: { level: 'artifact', wpId: '7', holderKey: null }, snap: 'half' },
      { view: { level: 'holder', holderKey: 'X' }, snap: 'half' },
      { view: { level: 'holder', holderKey: 'X' }, snap: 'peek' },
      { view: { level: 'holders' }, snap: 'full' },
    ];
    for (const s of states) {
      expect(sheetDepth(reduceSheet(s, { type: 'back' }))).toBe(sheetDepth(s) - 1);
    }
  });
});

describe('sessionTargetFor', () => {
  it('holders → no holder focus, no selection', () => {
    expect(sessionTargetFor({ level: 'holders' })).toEqual({ holderKey: null, wpId: null });
  });

  it('holder → holder focus, no selection', () => {
    expect(sessionTargetFor({ level: 'holder', holderKey: 'X' })).toEqual({ holderKey: 'X', wpId: null });
  });

  it('artifact → its holder focus and selection', () => {
    expect(sessionTargetFor({ level: 'artifact', wpId: '7', holderKey: 'X' })).toEqual({
      holderKey: 'X',
      wpId: '7',
    });
  });
});

describe('resolveMarkerTap', () => {
  it('a single-artifact pin opens that artifact under its holder', () => {
    expect(resolveMarkerTap([{ wpId: '7', holderKey: 'X' }])).toEqual({
      type: 'openArtifact',
      wpId: '7',
      holderKey: 'X',
    });
  });

  it('a one-holder pin opens that holder', () => {
    expect(
      resolveMarkerTap([
        { wpId: '7', holderKey: 'X' },
        { wpId: '8', holderKey: 'X' },
      ]),
    ).toEqual({ type: 'openHolder', holderKey: 'X' });
  });

  it('a mixed-holder pin (e.g. returned artifacts at Addis Ababa) opens the holders list', () => {
    expect(
      resolveMarkerTap([
        { wpId: '7', holderKey: 'British Museum' },
        { wpId: '8', holderKey: 'National Museum of Ethiopia' },
      ]),
    ).toEqual({ type: 'showHolders', open: true });
  });

  it('an empty pin does nothing', () => {
    expect(resolveMarkerTap([])).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./sheetNav"`.

- [ ] **Step 5: Implement `components/ReviewMap/sheetNav.ts`**

```ts
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all `sheetNav` tests green.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts components/ReviewMap/sheetNav.ts components/ReviewMap/sheetNav.test.ts
git commit -m "feat(review-map): add pure mobile sheet navigation with vitest

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Pure sheet geometry and swipe classification

**Files:**
- Create: `components/ReviewMap/sheetGeometry.ts`
- Test: `components/ReviewMap/sheetGeometry.test.ts`

**Interfaces:**
- Consumes: `SheetSnap` from `./sheetNav`
- Produces (from `components/ReviewMap/sheetGeometry.ts`):
  - `const SNAP_POINTS: (string | number)[]` — `['96px', 0.5, 0.92]`
  - `const PEEK_PX = 96`
  - `snapToVaul(snap: SheetSnap): string | number`
  - `vaulToSnap(value: string | number | null): SheetSnap`
  - `sheetInsetPx(snap: SheetSnap, viewportHeight: number): number`
  - `classifySwipe(dx: number, dy: number): 'next' | 'prev' | null`

- [ ] **Step 1: Write the failing tests**

`components/ReviewMap/sheetGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PEEK_PX, SNAP_POINTS, classifySwipe, sheetInsetPx, snapToVaul, vaulToSnap } from './sheetGeometry';

describe('snap mapping', () => {
  it('round-trips every snap through vaul values', () => {
    for (const snap of ['peek', 'half', 'full'] as const) {
      expect(vaulToSnap(snapToVaul(snap))).toBe(snap);
    }
  });

  it('maps to the configured snap points in order', () => {
    expect(SNAP_POINTS).toEqual(['96px', 0.5, 0.92]);
    expect(snapToVaul('peek')).toBe('96px');
  });

  it('treats an unknown or null vaul value as peek', () => {
    expect(vaulToSnap(null)).toBe('peek');
    expect(vaulToSnap(0.33)).toBe('peek');
  });
});

describe('sheetInsetPx', () => {
  it('peek covers the peek bar', () => {
    expect(sheetInsetPx('peek', 800)).toBe(PEEK_PX);
  });

  it('half covers half the viewport', () => {
    expect(sheetInsetPx('half', 800)).toBe(400);
  });

  it('full is capped at half so the camera still frames the upper map', () => {
    expect(sheetInsetPx('full', 800)).toBe(400);
  });
});

describe('classifySwipe', () => {
  it('a clear leftward swipe goes to the next artifact', () => {
    expect(classifySwipe(-80, 5)).toBe('next');
  });

  it('a clear rightward swipe goes to the previous artifact', () => {
    expect(classifySwipe(80, -5)).toBe('prev');
  });

  it('ignores short drags', () => {
    expect(classifySwipe(-40, 0)).toBeNull();
  });

  it('ignores mostly-vertical drags (sheet scrolling or dragging)', () => {
    expect(classifySwipe(-80, 70)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- sheetGeometry`
Expected: FAIL — `Failed to resolve import "./sheetGeometry"`.

- [ ] **Step 3: Implement `components/ReviewMap/sheetGeometry.ts`**

```ts
import type { SheetSnap } from './sheetNav';

/** Peek bar height; must match the first snap point. */
export const PEEK_PX = 96;

/** vaul snap points, in SheetSnap order: peek, half, full. */
export const SNAP_POINTS: (string | number)[] = [`${PEEK_PX}px`, 0.5, 0.92];

const SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

export function snapToVaul(snap: SheetSnap): string | number {
  return SNAP_POINTS[SNAPS.indexOf(snap)];
}

export function vaulToSnap(value: string | number | null): SheetSnap {
  const i = value === null ? -1 : SNAP_POINTS.indexOf(value);
  return i < 0 ? 'peek' : SNAPS[i];
}

/**
 * How many pixels at the bottom of the map the sheet hides, for camera framing.
 * A full sheet leaves almost no map, so frame as if half-open — that's what
 * the reader sees once they pull it back down.
 */
export function sheetInsetPx(snap: SheetSnap, viewportHeight: number): number {
  if (snap === 'peek') return PEEK_PX;
  return Math.round(viewportHeight * 0.5);
}

const MIN_SWIPE_PX = 56;

/** Horizontal swipe on the artifact card → step; anything vertical-ish is the sheet's. */
export function classifySwipe(dx: number, dy: number): 'next' | 'prev' | null {
  if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 'next' : 'prev';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (sheetNav + sheetGeometry).

- [ ] **Step 5: Commit**

```bash
git add components/ReviewMap/sheetGeometry.ts components/ReviewMap/sheetGeometry.test.ts
git commit -m "feat(review-map): add sheet snap, camera inset and swipe helpers

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Layout mode and selection policy

Mobile starts with nothing selected; desktop keeps pre-selecting the first artifact. Selection becomes derived during render (no reconcile effect), which also removes one of the baseline lint errors.

**Files:**
- Create: `components/ReviewMap/selection.ts`
- Test: `components/ReviewMap/selection.test.ts`
- Create: `components/ReviewMap/useLayoutMode.ts`
- Modify: `components/ReviewMap/useArtifactNav.ts` (whole file)
- Modify: `components/ReviewMap/useReviewMapState.ts:8-23`
- Modify: `components/ReviewMap/reviewMapUtils.ts` (add `holderKeyOf` after `UNKNOWN_HOLDER`)

**Interfaces:**
- Produces:
  - `type LayoutMode = 'compact' | 'wide'` and `useLayoutMode(): LayoutMode | null` (null until mounted) from `./useLayoutMode`
  - `reconcileSelection(wpIds: string[], chosen: string | null, mode: LayoutMode | null): string | null` from `./selection`
  - `stepIndex(length: number, index: number, dir: 1 | -1): number` from `./selection`
  - `holderKeyOf(card: ArtifactCard): string` from `./reviewMapUtils`
  - `useArtifactNav(filteredArtifacts, initialSelectedWpId, mode)` returns `{ selectedWpId, setSelectedWpId, selectedIndex, stepArtifact, handleNextArtifact, handlePreviousArtifact }` where `stepArtifact(dir: 1 | -1): string | null` selects and returns the new wpId. **`mobileMenuOpen`, `mobileDetailsOpen` and their setters are removed.**
  - `useReviewMapState(artifacts, wikidataHits, initialSelectedWpId, mode: LayoutMode | null)` — new 4th param; return value additionally exposes `stepArtifact`.

- [ ] **Step 1: Write the failing tests**

`components/ReviewMap/selection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reconcileSelection, stepIndex } from './selection';

describe('reconcileSelection', () => {
  const ids = ['a', 'b', 'c'];

  it('keeps a chosen artifact that is still in scope', () => {
    expect(reconcileSelection(ids, 'b', 'compact')).toBe('b');
    expect(reconcileSelection(ids, 'b', 'wide')).toBe('b');
  });

  it('wide layout falls back to the first artifact', () => {
    expect(reconcileSelection(ids, null, 'wide')).toBe('a');
    expect(reconcileSelection(ids, 'gone', 'wide')).toBe('a');
  });

  it('compact layout leaves nothing selected until the reader picks', () => {
    expect(reconcileSelection(ids, null, 'compact')).toBeNull();
    expect(reconcileSelection(ids, 'gone', 'compact')).toBeNull();
  });

  it('unknown layout (before mount) does not auto-select', () => {
    expect(reconcileSelection(ids, null, null)).toBeNull();
    expect(reconcileSelection(ids, 'b', null)).toBe('b');
  });

  it('empty scope selects nothing', () => {
    expect(reconcileSelection([], null, 'wide')).toBeNull();
  });
});

describe('stepIndex', () => {
  it('steps forward and wraps', () => {
    expect(stepIndex(3, 0, 1)).toBe(1);
    expect(stepIndex(3, 2, 1)).toBe(0);
  });

  it('steps backward and wraps', () => {
    expect(stepIndex(3, 0, -1)).toBe(2);
  });

  it('starts at the first artifact when nothing is selected', () => {
    expect(stepIndex(3, -1, 1)).toBe(0);
    expect(stepIndex(3, -1, -1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- selection`
Expected: FAIL — `Failed to resolve import "./selection"`.

- [ ] **Step 3: Implement `components/ReviewMap/useLayoutMode.ts`**

```ts
import { useSyncExternalStore } from 'react';

export type LayoutMode = 'compact' | 'wide';

/** Tailwind's `lg` — the one boundary between the sheet layout and the columns. */
const WIDE_QUERY = '(min-width: 64rem)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(WIDE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): LayoutMode {
  return window.matchMedia(WIDE_QUERY).matches ? 'wide' : 'compact';
}

/** `null` on the server and during hydration, so nothing layout-specific runs early. */
function getServerSnapshot(): LayoutMode | null {
  return null;
}

export function useLayoutMode(): LayoutMode | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 4: Implement `components/ReviewMap/selection.ts`**

```ts
import type { LayoutMode } from './useLayoutMode';

/**
 * Which artifact is selected, given what the reader chose and what's in scope.
 * Wide layouts always show something in the artifact pane; compact layouts
 * leave the selection empty until the reader picks one.
 */
export function reconcileSelection(
  wpIds: string[],
  chosen: string | null,
  mode: LayoutMode | null,
): string | null {
  if (chosen && wpIds.includes(chosen)) return chosen;
  return mode === 'wide' ? (wpIds[0] ?? null) : null;
}

/** Next/previous index with wrap-around; no selection starts at the first. */
export function stepIndex(length: number, index: number, dir: 1 | -1): number {
  if (index < 0) return 0;
  return (index + dir + length) % length;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Replace `components/ReviewMap/useArtifactNav.ts`**

```ts
import { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { reconcileSelection, stepIndex } from './selection';
import type { LayoutMode } from './useLayoutMode';

export function useArtifactNav(
  filteredArtifacts: ArtifactCard[],
  initialSelectedWpId: string | null = null,
  mode: LayoutMode | null = null,
) {
  // What the reader last picked. The effective selection is derived from it
  // each render, so a filter change can't leave a stale selection behind.
  const [chosenWpId, setSelectedWpId] = useState<string | null>(initialSelectedWpId);

  const wpIds = useMemo(() => filteredArtifacts.map((a) => a.wpId), [filteredArtifacts]);
  const selectedWpId = reconcileSelection(wpIds, chosenWpId, mode);
  const selectedIndex = selectedWpId ? wpIds.indexOf(selectedWpId) : -1;

  const stepArtifact = (dir: 1 | -1): string | null => {
    if (wpIds.length === 0) return null;
    const next = wpIds[stepIndex(wpIds.length, selectedIndex, dir)] ?? null;
    setSelectedWpId(next);
    return next;
  };

  return {
    selectedWpId,
    setSelectedWpId,
    selectedIndex,
    stepArtifact,
    handleNextArtifact: () => { stepArtifact(1); },
    handlePreviousArtifact: () => { stepArtifact(-1); },
  };
}
```

- [ ] **Step 7: Thread `mode` through `useReviewMapState`**

In `components/ReviewMap/useReviewMapState.ts`, add the import and the parameter, and pass it on:

```ts
import type { LayoutMode } from './useLayoutMode';

export function useReviewMapState(
  artifacts: ArtifactCard[],
  wikidataHits: Record<string, ReviewWikidataHit>,
  initialSelectedWpId: string | null = null,
  mode: LayoutMode | null = null,
) {
```

and change

```ts
  const nav = useArtifactNav(filteredArtifacts, initialSelectedWpId);
```

to

```ts
  const nav = useArtifactNav(filteredArtifacts, initialSelectedWpId, mode);
```

(`...nav` in the return already exposes `stepArtifact`.)

- [ ] **Step 8: Add `holderKeyOf` to `components/ReviewMap/reviewMapUtils.ts`**

Directly after `export const UNKNOWN_HOLDER = 'Unknown / Unresolved';`:

```ts
/** The key an artifact is grouped under in the holders list. */
export function holderKeyOf(card: ArtifactCard): string {
  return card.holder?.name ?? UNKNOWN_HOLDER;
}
```

- [ ] **Step 9: Keep `index.tsx` compiling until Task 7**

`components/ReviewMap/index.tsx` still destructures `mobileMenuOpen`, `setMobileMenuOpen`, `mobileDetailsOpen`, `setMobileDetailsOpen`. Replace those four names in the destructuring with nothing, and add local state just above `return`:

```tsx
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
```

with `import { useState } from 'react';` at the top. Also pass the layout mode in:

```tsx
import { useLayoutMode } from './useLayoutMode';
// …
  const mode = useLayoutMode();
  const { /* … */ } = useReviewMapState(artifacts, wikidataHits, initialSelectedWpId, mode);
```

This is temporary scaffolding; Task 7 deletes it along with the old mobile components.

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm test` → PASS.
Run: `npx eslint components/ReviewMap/useArtifactNav.ts components/ReviewMap/selection.ts components/ReviewMap/useLayoutMode.ts` → no errors (the old `set-state-in-effect` error in `useArtifactNav.ts` is gone).
Manual: `npm run dev`, open `/` at 1440px width → the first artifact is pre-selected, as before. At 390px width (DevTools device mode) → header shows "No artifact selected."

- [ ] **Step 11: Commit**

```bash
git add components/ReviewMap/selection.ts components/ReviewMap/selection.test.ts components/ReviewMap/useLayoutMode.ts components/ReviewMap/useArtifactNav.ts components/ReviewMap/useReviewMapState.ts components/ReviewMap/reviewMapUtils.ts components/ReviewMap/index.tsx
git commit -m "feat(review-map): no pre-selection on compact layouts, derive selection

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Sheet state adapter and history mirroring

**Files:**
- Create: `components/ReviewMap/useMobileSheet.ts`
- Create: `components/ReviewMap/useSheetHistory.ts`

**Interfaces:**
- Consumes: `initSheet`, `reduceSheet`, `sheetDepth`, `SheetAction`, `SheetState`, `SheetView` from `./sheetNav`
- Produces:
  - `useMobileSheet(initialWpId: string | null, onViewChange: (next: SheetView, prev: SheetView) => void): { sheet: SheetState; dispatch: (action: SheetAction) => void }` — `dispatch` is stable; `onViewChange` fires synchronously inside `dispatch` only when the view (not just the snap) changed.
  - `useSheetHistory(depth: number, onBack: () => void, enabled: boolean): void`

- [ ] **Step 1: Implement `components/ReviewMap/useMobileSheet.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { initSheet, reduceSheet, type SheetAction, type SheetState, type SheetView } from './sheetNav';

/**
 * React adapter over `sheetNav`. `dispatch` reduces against the latest state
 * (not a render closure), so it is safe to call from a popstate listener, and
 * reports view changes synchronously so the caller can move the review
 * session in the same batch as the sheet.
 */
export function useMobileSheet(
  initialWpId: string | null,
  onViewChange: (next: SheetView, prev: SheetView) => void,
) {
  const [sheet, setSheet] = useState<SheetState>(() => initSheet(initialWpId));
  const sheetRef = useRef(sheet);
  const onViewChangeRef = useRef(onViewChange);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  const dispatch = useCallback((action: SheetAction) => {
    const prev = sheetRef.current;
    const next = reduceSheet(prev, action);
    if (next === prev) return;
    sheetRef.current = next;
    setSheet(next);
    if (next.view !== prev.view) onViewChangeRef.current(next.view, prev.view);
  }, []);

  return { sheet, dispatch };
}
```

- [ ] **Step 2: Implement `components/ReviewMap/useSheetHistory.ts`**

```ts
import { useEffect, useRef } from 'react';

/**
 * Keeps one browser history entry per level of sheet depth, so the phone's
 * Back gesture steps back through the sheet instead of leaving the site.
 *
 * - Depth grows (drill in, open) → push entries.
 * - Depth shrinks from the UI (← button, drag to peek) → rewind history
 *   silently, so the next Back doesn't replay a level that's already gone.
 * - A real Back (popstate) → call `onBack`, which shrinks depth by exactly one
 *   (see `sheetDepth`), leaving history and sheet in step.
 */
export function useSheetHistory(depth: number, onBack: () => void, enabled: boolean) {
  const pushed = useRef(0);
  const silentPops = useRef(0);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    if (depth > pushed.current) {
      for (let i = pushed.current; i < depth; i += 1) window.history.pushState({ lootedSheet: i + 1 }, '');
      pushed.current = depth;
    } else if (depth < pushed.current) {
      // One history.go() fires one popstate, however many entries it skips.
      silentPops.current += 1;
      window.history.go(depth - pushed.current);
      pushed.current = depth;
    }
  }, [depth, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onPop = () => {
      if (silentPops.current > 0) {
        silentPops.current -= 1;
        return;
      }
      if (pushed.current === 0) return;
      pushed.current -= 1;
      onBackRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [enabled]);
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npx eslint components/ReviewMap/useMobileSheet.ts components/ReviewMap/useSheetHistory.ts` → no errors.
(Behaviour is exercised end-to-end in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add components/ReviewMap/useMobileSheet.ts components/ReviewMap/useSheetHistory.ts
git commit -m "feat(review-map): add mobile sheet adapter and back-gesture history sync

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Mobile sheet UI

**Files:**
- Modify: `package.json` (add `vaul`)
- Create: `components/Artifact/ProvenanceSummary.tsx`
- Modify: `components/Artifact/ProvenanceReferences.tsx:18-35`
- Create: `components/ReviewMap/mobile/MobileTopBar.tsx`
- Create: `components/ReviewMap/mobile/MapFilterChips.tsx`
- Create: `components/ReviewMap/mobile/SheetHoldersList.tsx`
- Create: `components/ReviewMap/mobile/SheetHolderArtifacts.tsx`
- Create: `components/ReviewMap/mobile/SheetArtifactView.tsx`
- Create: `components/ReviewMap/mobile/MobileSheet.tsx`

**Interfaces:**
- Consumes: `SheetState`, `SheetAction` (`./sheetNav`), `SNAP_POINTS`, `snapToVaul`, `vaulToSnap`, `classifySwipe` (`./sheetGeometry`), `holderKeyOf`, `MuseumGroup` (`./reviewMapUtils`)
- Produces:
  - `ProvenanceSummary({ takenFromLabel: string; currentLocationLabel: string; responsibleLabel: string | null })`
  - `MobileTopBar()` — no props
  - `MapFilterChips({ showReturnedOnly, onToggleReturnedOnly, returnedCount, showWeakLinkArtifacts, onToggleWeakLinkArtifacts })`
  - `MobileSheet(props: MobileSheetProps)` with:

```ts
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
}
```

- [ ] **Step 1: Install vaul**

```bash
npm install vaul@^1.1.2
```

- [ ] **Step 2: Extract `components/Artifact/ProvenanceSummary.tsx`**

The markup moves verbatim out of `ProvenanceReferences`.

```tsx
'use client';

export default function ProvenanceSummary({
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
}: {
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
}) {
  return (
    <div className="rounded border border-navy-border/70 bg-navy/60 px-4 py-4 text-base text-parchment-dim">
      <p className="text-parchment text-lg font-medium">Provenance</p>
      <div className="mt-3 space-y-2">
        <p>
          <span className="text-parchment">Taken from:</span> {takenFromLabel}
        </p>
        <p>
          <span className="text-parchment">Current location:</span> {currentLocationLabel}
        </p>
        {responsibleLabel && (
          <p>
            <span className="text-parchment">Responsible institution:</span> {responsibleLabel}
          </p>
        )}
      </div>
    </div>
  );
}
```

In `components/Artifact/ProvenanceReferences.tsx`, add `import ProvenanceSummary from './ProvenanceSummary';` and replace the first `<div className="rounded border border-navy-border/70 bg-navy/60 px-4 py-4 text-base text-parchment-dim">…</div>` block (the Provenance card, lines 18-35) with:

```tsx
      <ProvenanceSummary
        takenFromLabel={takenFromLabel}
        currentLocationLabel={currentLocationLabel}
        responsibleLabel={responsibleLabel}
      />
```

- [ ] **Step 3: Create `components/ReviewMap/mobile/MobileTopBar.tsx`**

```tsx
import Link from 'next/link';

export default function MobileTopBar() {
  return (
    <header className="lg:hidden flex h-11 shrink-0 items-center justify-between border-b border-navy-border bg-navy-light/90 px-3">
      <h1 className="font-heading text-base text-parchment truncate">Looted from Maqdala</h1>
      <Link
        href="/library"
        aria-label="View library"
        title="View library"
        className="flex h-9 w-9 items-center justify-center rounded text-gold hover:bg-navy/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </Link>
    </header>
  );
}
```

- [ ] **Step 4: Create `components/ReviewMap/mobile/MapFilterChips.tsx`**

```tsx
export default function MapFilterChips({
  showReturnedOnly,
  onToggleReturnedOnly,
  returnedCount,
  showWeakLinkArtifacts,
  onToggleWeakLinkArtifacts,
}: {
  showReturnedOnly: boolean;
  onToggleReturnedOnly: () => void;
  returnedCount: number;
  showWeakLinkArtifacts: boolean;
  onToggleWeakLinkArtifacts: () => void;
}) {
  const chip =
    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium shadow backdrop-blur-sm transition-colors disabled:opacity-50';
  return (
    <div className="lg:hidden absolute inset-x-2 top-2 z-1000 flex gap-2 overflow-x-auto">
      <button
        type="button"
        aria-pressed={showReturnedOnly}
        onClick={onToggleReturnedOnly}
        disabled={returnedCount === 0}
        className={`${chip} ${
          showReturnedOnly
            ? 'border-emerald-400/60 bg-emerald-500/80 text-white'
            : 'border-navy-border bg-navy/80 text-parchment'
        }`}
      >
        Returned to Ethiopia ({returnedCount})
      </button>
      <button
        type="button"
        aria-pressed={showWeakLinkArtifacts}
        onClick={onToggleWeakLinkArtifacts}
        disabled={showReturnedOnly}
        className={`${chip} ${
          showWeakLinkArtifacts
            ? 'border-blue-300/60 bg-blue-500/80 text-white'
            : 'border-navy-border bg-navy/80 text-parchment'
        }`}
      >
        Weak links
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create `components/ReviewMap/mobile/SheetHoldersList.tsx`**

```tsx
import type { MuseumGroup } from '../reviewMapUtils';

export default function SheetHoldersList({
  museumGroups,
  onOpenHolder,
}: {
  museumGroups: MuseumGroup[];
  onOpenHolder: (holderKey: string) => void;
}) {
  return (
    <ul className="divide-y divide-navy-border/60">
      {museumGroups.map((g) => (
        <li key={g.key}>
          <button
            type="button"
            onClick={() => onOpenHolder(g.key)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-base text-parchment active:bg-navy-light/60"
          >
            <span className="truncate">{g.name}</span>
            <span className="shrink-0 text-sm text-parchment-dim">{g.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Create `components/ReviewMap/mobile/SheetHolderArtifacts.tsx`**

Weak-link highlighting matches `LeftRail`.

```tsx
import type { ArtifactCard } from '@/lib/types';

export default function SheetHolderArtifacts({
  artifacts,
  onOpenArtifact,
}: {
  artifacts: ArtifactCard[];
  onOpenArtifact: (wpId: string) => void;
}) {
  if (artifacts.length === 0) {
    return <p className="px-4 py-6 text-sm text-parchment-dim">No artifacts from this holder are in view.</p>;
  }
  return (
    <ul className="divide-y divide-navy-border/60">
      {artifacts.map((a) => (
        <li key={a.wpId}>
          <button
            type="button"
            onClick={() => onOpenArtifact(a.wpId)}
            className={`w-full px-4 py-3 text-left text-base ${
              a.weakLink ? 'bg-gold/20 text-gold' : 'text-parchment active:bg-navy-light/60'
            }`}
          >
            <span className="line-clamp-2">{a.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: Create `components/ReviewMap/mobile/SheetArtifactView.tsx`**

```tsx
'use client';
import { useRef } from 'react';
import Image from 'next/image';
import type { ArtifactCard } from '@/lib/types';
import ProvenanceSummary from '../../Artifact/ProvenanceSummary';
import { classifySwipe } from '../sheetGeometry';

export default function SheetArtifactView({
  selected,
  previewTitle,
  previewImage,
  wikidataUrl,
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
  onStep,
}: {
  selected: ArtifactCard | null;
  previewTitle: string | null;
  previewImage: string | undefined;
  wikidataUrl: string | null;
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
  onStep: (dir: 1 | -1) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  if (!selected) {
    return <p className="px-4 py-6 text-sm text-parchment-dim">This artifact is not in the current view.</p>;
  }

  const title = previewTitle ?? selected.title;
  const primarySourceUrl = selected.sourceLinks[0] ?? null;
  const linkClass =
    'rounded border border-blue-300/60 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 active:bg-blue-500/25';

  return (
    <div
      className="space-y-4 px-4 pb-8 pt-2"
      onTouchStart={(e) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const t = e.changedTouches[0];
        const swipe = classifySwipe(t.clientX - start.current.x, t.clientY - start.current.y);
        start.current = null;
        if (swipe) onStep(swipe === 'next' ? 1 : -1);
      }}
    >
      {previewImage && (
        <div className="relative h-48 overflow-hidden rounded border border-navy-border bg-navy">
          <Image src={previewImage} alt={title} fill className="object-contain" unoptimized />
        </div>
      )}

      <p className="text-sm text-parchment-dim">
        <span className="uppercase tracking-wide text-parchment-dim/80">Holder</span>{' '}
        <span className="text-parchment">{selected.holder?.name ?? 'Unresolved'}</span>
      </p>

      <ProvenanceSummary
        takenFromLabel={takenFromLabel}
        currentLocationLabel={currentLocationLabel}
        responsibleLabel={responsibleLabel}
      />

      <div className="flex flex-wrap gap-2">
        {wikidataUrl && (
          <a href={wikidataUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            View on Wikidata ↗
          </a>
        )}
        {primarySourceUrl && (
          <a href={primarySourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Open primary source ↗
          </a>
        )}
        {!wikidataUrl && !primarySourceUrl && (
          <span className="text-sm text-parchment-dim/70">No source link available</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create `components/ReviewMap/mobile/MobileSheet.tsx`**

The header row is always visible at peek (96px), so the level and ‹ › stay reachable with the sheet collapsed.

```tsx
'use client';
import { Drawer } from 'vaul';
import type { ArtifactCard } from '@/lib/types';
import type { SheetAction, SheetState } from '../sheetNav';
import { SNAP_POINTS, snapToVaul, vaulToSnap } from '../sheetGeometry';
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
          className="lg:hidden fixed inset-x-0 bottom-0 z-1001 flex h-full max-h-[92%] flex-col rounded-t-2xl border-t border-navy-border bg-navy-light shadow-[0_-12px_40px_rgba(0,0,0,0.45)] outline-none"
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
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

`z-1001` puts the sheet above Leaflet's panes and controls (`z-1000` is used for map overlays in this repo).

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit` → no errors. If vaul's `setActiveSnapPoint` type is `(snap: number | string | null) => void`, the lambda above already matches.
Run: `npx eslint components/ReviewMap/mobile components/Artifact/ProvenanceSummary.tsx components/Artifact/ProvenanceReferences.tsx` → no errors.
Manual: at 1440px, the desktop artifact pane's Provenance card looks identical to before.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json components/Artifact/ProvenanceSummary.tsx components/Artifact/ProvenanceReferences.tsx components/ReviewMap/mobile
git commit -m "feat(review-map): add mobile top bar, filter chips and drill-in sheet

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Leaflet — compact taps, camera inset, resize

**Files:**
- Modify: `components/ReviewMap/ReviewMapLeaflet.tsx`

**Interfaces:**
- Produces: `ReviewMapLeaflet` accepts three new optional props:
  - `compact?: boolean` — no tooltips, no zoom buttons, taps call `onMarkerTap`
  - `onMarkerTap?: (artifacts: ArtifactCard[]) => void`
  - `bottomInset?: number` — px of map hidden by the sheet; read at fly time, **not** a camera dependency

- [ ] **Step 1: Extend props and imports**

Change the react-leaflet import to include `ZoomControl`, and `react` to include `useRef`:

```ts
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
```

Add to `interface Props`:

```ts
  /** Compact (sheet) layout: no tooltips or zoom buttons; taps go to onMarkerTap. */
  compact?: boolean;
  onMarkerTap?: (artifacts: ArtifactCard[]) => void;
  /** Pixels at the bottom of the map covered by the mobile sheet. */
  bottomInset?: number;
```

- [ ] **Step 2: Make the controller inset-aware and resize-aware**

Replace `ReviewMapController` with:

```tsx
function ReviewMapController({
  artifacts,
  selectedWpId,
  focusCoords,
  bottomInset = 0,
}: {
  artifacts: ArtifactCard[];
  selectedWpId: string | null;
  focusCoords?: [number, number] | null;
  bottomInset?: number;
}) {
  const map = useMap();
  // Deps need a stable signature, otherwise a new array literal would re-fire
  // the effect on every parent render.
  const focusKey = focusCoords ? `${focusCoords[0]},${focusCoords[1]}` : '';

  // Read at fly time rather than depended on: dragging the sheet must not
  // re-fly the camera. Declared before the camera effect so a commit that
  // changes both the inset and the target flies with the new inset.
  const insetRef = useRef(bottomInset);
  useEffect(() => {
    insetRef.current = bottomInset;
  }, [bottomInset]);

  // The artifact pane can collapse without a window resize; Leaflet only
  // re-measures on window resize, so watch the container itself.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const inset = insetRef.current;
    // Shift a fly-to centre down by half the hidden strip, so the target
    // lands in the middle of the visible map rather than behind the sheet.
    const visibleCenter = (coords: L.LatLngExpression, zoom: number) =>
      inset ? map.unproject(map.project(coords, zoom).add([0, inset / 2]), zoom) : coords;

    // Holder rail just narrowed the view — zoom in on the museum.
    if (focusCoords) {
      map.flyTo(visibleCenter(focusCoords, 7), 7, { duration: 1 });
      return;
    }

    if (!selectedWpId) {
      map.flyTo(visibleCenter(MAGDALA_COORDS, 3), 3, { duration: 0.8 });
      return;
    }

    const selected = artifacts.find((a) => a.wpId === selectedWpId);
    const coords = selected ? artifactCoords(selected) : undefined;
    if (!coords) return;
    const bounds = L.latLngBounds([MAGDALA_COORDS, coords]);
    map.flyToBounds(bounds, { paddingTopLeft: [70, 70], paddingBottomRight: [70, 70 + inset], duration: 1 });
  }, [artifacts, map, selectedWpId, focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

Note: on desktop `bottomInset` is 0, so `visibleCenter` returns `coords` unchanged and the padding equals the old `[70, 70]` on all sides — desktop camera behaviour is identical.

- [ ] **Step 3: Wire the new props in the component**

Change the signature:

```tsx
export default function ReviewMapLeaflet({
  artifacts,
  wikidataHits,
  selectedWpId,
  onSelect,
  focusCoords,
  compact = false,
  onMarkerTap,
  bottomInset = 0,
}: Props) {
```

On `MapContainer`, change `zoomControl` to `zoomControl={false}`, and add as the first child after `<TileLayer … />`:

```tsx
      {!compact && <ZoomControl position="topleft" />}
```

Pass the inset to the controller:

```tsx
      <ReviewMapController
        artifacts={artifacts}
        selectedWpId={selectedWpId}
        focusCoords={focusCoords}
        bottomInset={bottomInset}
      />
```

In the markers map, change the click handler:

```tsx
            eventHandlers={{
              click: () =>
                compact && onMarkerTap ? onMarkerTap(group.artifacts) : onSelect(group.artifacts[0].wpId),
            }}
```

and wrap the holder `<Tooltip … opacity={1}>…</Tooltip>` so it only renders on wide layouts:

```tsx
            {!compact && (
              <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
                {/* …existing tooltip body, unchanged… */}
              </Tooltip>
            )}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → no errors.
Run: `npm run build` → succeeds.
Manual (1440px): hover a pin → tooltip as before; click a holder in the left rail → map flies to it; click an artifact → map frames Magdala + artifact. **ADR-0001 checks:** (1) with a holder focused, clicking different artifacts in the rail — note whether the holder fly-to re-fires (it does on `main` today; this task must not make it worse); (2) toggle "Returned to Ethiopia", select a returned artifact → the camera frames Addis Ababa, not the prior holder.

- [ ] **Step 5: Commit**

```bash
git add components/ReviewMap/ReviewMapLeaflet.tsx
git commit -m "feat(review-map): compact marker taps, sheet-aware camera, resize-aware map

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Wire the layouts and delete the old mobile overlays

**Files:**
- Modify: `components/ReviewMap/index.tsx` (whole file)
- Modify: `components/ReviewMap/LeftRail.tsx:21`
- Modify: `components/Artifact/ArtifactPane.tsx`
- Delete: `components/ReviewMap/MobileHeader.tsx`, `components/ReviewMap/MobileMenu.tsx`, `components/ReviewMap/MobileDetails.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: `ArtifactPane` accepts `collapsed?: boolean` and `onToggleCollapsed?: () => void`.

- [ ] **Step 1: LeftRail breakpoint**

In `components/ReviewMap/LeftRail.tsx`, change `hidden md:block w-64` to `hidden lg:block w-64`.

- [ ] **Step 2: ArtifactPane mid width + collapse**

In `components/Artifact/ArtifactPane.tsx`, add to `ArtifactPaneProps`:

```ts
  /** 1024–1279px only: pane slid away to widen the map. Ignored at xl. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
```

destructure `collapsed = false, onToggleCollapsed`, and replace the `<aside …>` opening tag with:

```tsx
    <aside
      className={`hidden lg:block relative w-105 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto ${
        collapsed ? 'lg:hidden xl:block' : ''
      }`}
    >
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Hide artifact pane"
          title="Hide artifact pane"
          className="xl:hidden absolute right-2 top-2 z-10 rounded px-2 py-1 text-parchment-dim hover:bg-navy/60"
        >
          »
        </button>
      )}
```

(The closing `</aside>` is unchanged.)

- [ ] **Step 3: Replace `components/ReviewMap/index.tsx`**

```tsx
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

  const bottomInset = compact ? sheetInsetPx(sheet.snap, window.innerHeight) : 0;

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

      <div className="flex-1 min-w-0 relative">
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
        />
      )}
    </div>
  );
}
```

Notes for the implementer:
- `h-dvh` (not `h-screen`) so mobile browser chrome doesn't push the map under the sheet.
- `window.innerHeight` is only read when `compact` is true, which is never on the server (`useLayoutMode` returns `null` there).
- `handleSelectMuseum` is recreated each render in `useReviewMapState`, so `applySheetView` is too; `useMobileSheet` keeps the latest one in a ref, so that's fine.
- If `handleSelectMuseum` / `setSelectedWpId` identity warnings appear from `react-hooks/exhaustive-deps`, keep the deps as written.

- [ ] **Step 4: Delete the old overlays**

```bash
git rm components/ReviewMap/MobileHeader.tsx components/ReviewMap/MobileMenu.tsx components/ReviewMap/MobileDetails.tsx
```

Then confirm nothing still imports them: `git grep -n "MobileHeader\|MobileMenu\|MobileDetails"` → no matches outside `docs/`.

- [ ] **Step 5: Verify build and tests**

Run: `npm test` → PASS.
Run: `npx tsc --noEmit` → no errors.
Run: `npm run build` → succeeds.
Run: `npm run lint` → no errors in any file this plan created or modified other than the pre-existing one in `useMuseumFilter.ts`.

- [ ] **Step 6: Manual verification — phone (DevTools, iPhone 14 Pro 393×852, then Galaxy S8 360×740)**

Start `npm run dev`, open `/`.
1. Top bar shows "Looted from Maqdala" + book icon; chips sit over the map; sheet peeks with "N holders · M artifacts". Nothing is selected (no highlighted pin, no dashed line).
2. Drag the sheet to half, then full, then back to peek → the map does **not** re-fly at any point.
3. Tap a holder in the sheet → sheet shows its artifacts, weak links in gold, map flies to that holder with the pin above the sheet.
4. Tap an artifact → essentials view: image, holder, provenance, Wikidata / primary source buttons. No categories, references or theprinceandtheplunder link. Dashed line from Magdala, both ends visible above the sheet.
5. Swipe the card left → next artifact in that holder; right → previous; ‹ › do the same; counter updates. A vertical scroll inside the card does not change artifact.
6. Press the browser Back button: artifact → holder list → holders → peek → leaves the page (4 presses). Repeat using the in-sheet ← for the first two steps, then browser Back → still one level at a time, never skipping.
7. Tap a single-artifact pin → artifact view directly. Tap a multi-artifact pin → that holder's list.
8. Tap "Returned to Ethiopia" chip with an artifact open → sheet falls back to holders at the same height. Tap the Addis Ababa pin → holders list opens at half.
9. Open `/?wpId=<some wpId from the library>` → sheet opens at half on that artifact; Back → holders → peek.
10. Landscape (852×393) → sheet usable, capped at 92%, map still pans.

- [ ] **Step 7: Manual verification — tablet and desktop**

1. 1024×768: three columns, pane ~420px; click » → pane hides, map widens **without grey tiles**; "« Artifact" brings it back; clicking an artifact in the rail also brings it back.
2. 1280×800 and 1440×900: identical to `main` — 736px pane, no » button, tooltips on hover, first artifact pre-selected.
3. 800×1280 (portrait tablet): sheet layout, not columns.

- [ ] **Step 8: Commit**

```bash
git add components/ReviewMap/index.tsx components/ReviewMap/LeftRail.tsx components/Artifact/ArtifactPane.tsx
git commit -m "feat(review-map): map-first mobile layout with drill-in sheet; collapsible mid-width pane

Replaces the full-screen mobile overlays with a vaul bottom sheet, moves the
columns breakpoint from md to lg, and lets the 1024-1279px artifact pane
collapse.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
