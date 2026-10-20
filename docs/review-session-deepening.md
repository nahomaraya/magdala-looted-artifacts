# Spec: deepen the review session

**Audience:** the engineer/agent implementing this refactor.
**Status:** ready to start. Design settled; this doc is the spec.
**Related:** `CONTEXT.md` (domain language), `docs/adr/0001-camera-precedence-stays-in-the-map-effect.md`.

---

## 1. Goal

`components/ReviewMap/` spreads one screen's state across four hooks that each
see a slice. Collapse them into **one deep module with a pure interface**, so
that the rules connecting them live somewhere and can be tested.

The module is `reviewSession`: a state type, a `reduce`, and a `derive`. It has
no React in it. `useReviewSession` is a thin adapter over it.

### Why

`useReviewMapState` takes 3 parameters and returns **29 values**. `index.tsx`
destructures all 29 and re-scatters them as **48 props** across 6 children.
`ArtifactPane` takes 13 props and uses exactly one. The pure helpers in
`reviewMapUtils.ts` are well-factored and bug-free; both live bugs are in the
wiring *between* the hooks, which no current interface exposes.

### Non-goals

- Do **not** change the `ArtifactCard` shape in `lib/types.ts`.
- Do **not** touch the data layer's `returned` field or `lib/dedup.ts`
  dormancy — those belong to separate candidates.
- No visual redesign. Class names and markup carry over unchanged except where
  a prop is renamed.

---

## 2. Decisions already made (do not relitigate)

| Decision | Choice |
|---|---|
| Module shape | Pure `reduce`/`derive` module + thin `useReducer` adapter |
| Presentation derivations | Leave the session; move to a pure presentation module |
| Camera precedence | Stays in the Leaflet effect — see ADR-0001 |
| Mobile drawer state | Leaves the session entirely |
| Selection on filter change | **Reset** to the new list's first artifact |
| Reducer signature | `reduce(state, action, artifacts, pinnedWpId)` — list-aware |
| Deep-link pin lifetime | Survives filter changes; dies on explicit artifact pick |
| Shared coords home | New `lib/repatriation.ts` |
| Duplicate `getStatus` | Delete it, **and** strip the unreachable `'fuzzy'` branch |
| `reviewMapUtils.ts` | Dissolves — contents redistributed by concept |
| Test runner | Vitest, added after the refactor lands |
| Domain term | **holder** (not museum, not institution) |

---

## 3. The two bugs this fixes

Both are reproducible on `main` @ `e5df7f1`.

**Bug 1 — holder fly-to shadows artifact selection.**
`useMuseumFilter.ts:28` computes `focusedCoords` as a *steady-state* value: it
stays non-null the whole time a holder is selected. `ReviewMapLeaflet.tsx:92`
early-returns on it, but its dependency array includes `selectedWpId`. So every
artifact click re-fires the effect and flies back to the holder at zoom 7. The
polyline redraws to the new artifact while the camera snaps away from it.

*Fix:* the session emits `focusToken`, incremented only by `selectHolder`. The
effect flies to the holder only when the token changes.

**Bug 2 — camera ignores the repatriation override.**
`ReviewMapLeaflet.tsx:16` places pins via `artifactCoords`, which returns
`ADDIS_ABABA_COORDS` for returned artifacts. `useMuseumFilter.ts:30` computes
the fly-to target from `a.holder?.coords` raw. Select a holder whose artifacts
were repatriated and the camera flies to London while the pins sit in Addis.

*Fix:* one `displayCoords` in `lib/repatriation.ts`, used by the pins, the
polyline and the fly-to.

**Also dissolved (not a listed bug):** `useReviewMapState.ts:30` sets the
selection imperatively while `useArtifactNav.ts:9` resets it reactively. Both
fire when a holder is picked and happen to agree. In a `reduce` this race
cannot be written — `selectHolder` resolves the new selection in one step.

---

## 4. Target module structure

```
lib/repatriation.ts                     NEW   isReturned, displayCoords
components/ReviewMap/reviewSession.ts   NEW   the deep module (pure)
components/ReviewMap/useReviewSession.ts NEW  React adapter
components/ReviewMap/useDrawers.ts      NEW   mobile drawer state
components/ReviewMap/reviewMapTypes.ts  NEW   shared types
components/Artifact/presentation.ts     NEW   per-card display projection

components/ReviewMap/useReviewMapState.ts    DELETE
components/ReviewMap/useArtifactNav.ts       DELETE
components/ReviewMap/useVisibleArtifacts.ts  DELETE
components/ReviewMap/useMuseumFilter.ts      DELETE
components/ReviewMap/reviewMapUtils.ts       DELETE (redistributed)
```

---

## 5. The interface

### `lib/repatriation.ts`

```ts
/** An artifact counts as returned when the data layer flagged it, when it
 *  carries the "Returned plunder" category, or when any holder is the
 *  National Museum of Ethiopia. */
export function isReturned(card: ArtifactCard): boolean;

/** Where the artifact sits on the map. Returned artifacts default to Addis
 *  Ababa regardless of their prior holder. */
export function displayCoords(card: ArtifactCard): [number, number] | undefined;
```

Body moves verbatim from `reviewMapUtils.isReturnedArtifact` and
`ReviewMapLeaflet.artifactCoords`. No behaviour change.

### `components/ReviewMap/reviewSession.ts`

```ts
export const UNKNOWN_HOLDER = 'Unknown / Unresolved';

export type HolderGroup = {
  key: string; name: string; qid: string | null; count: number;
};

export type SessionState = {
  showWeakLink: boolean;
  showReturnedOnly: boolean;
  holder: string | null;
  selectedWpId: string | null;
  /** False until the user picks an artifact themselves. Gates the deep-link pin. */
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

export function initSession(
  artifacts: ArtifactCard[], pinnedWpId: string | null,
): SessionState;
export function reduce(
  state: SessionState, action: SessionAction,
  artifacts: ArtifactCard[], pinnedWpId: string | null,
): SessionState;
export function derive(
  state: SessionState, artifacts: ArtifactCard[], pinnedWpId: string | null,
): SessionView;
```

**Three functions and two type unions, down from 29 returned values. No setters.**

### Rules the module owns

1. **Visibility.** `showReturnedOnly` is exclusive and wins over `showWeakLink`:
   it shows every returned artifact regardless of weak-link or source-link
   status. Otherwise `showWeakLink` shows everything; the default shows only
   artifacts that are not weak links *and* have at least one source link.
2. **The pin.** While `hasNavigated` is false, `pinnedWpId` is visible whatever
   the filters say. `selectArtifact`, `next` and `prev` all set `hasNavigated`
   — each is the user deliberately moving off the deep-linked artifact — after
   which the pin is gone and holder counts stop being inflated. Toggles and
   `selectHolder` do not set it.

   `initSession` takes the artifact list for the same reason `reduce` does:
   with no deep link it must select the first artifact, which today is
   `useArtifactNav`'s `filteredArtifacts[0]` default.
3. **Holder groups.** Group `visible` by `holder?.name ?? UNKNOWN_HOLDER`,
   carry the first `qid` seen, sort by count descending.
4. **Filtering.** `filtered` is `visible` narrowed to the selected holder, or
   `visible` when no holder is selected.
5. **Selection reset.** `selectHolder`, `toggleWeakLink` and `toggleReturnedOnly`
   all reset `selectedWpId` to the first artifact of the resulting `filtered`
   list, or `null` when it is empty.
6. **Wrapping navigation.** `next`/`prev` wrap modulo `filtered.length`; from
   an unfound selection (`selectedIndex < 0`) both land on index 0.
7. **Focus token.** Incremented by `selectHolder` only — not by toggles, not by
   navigation.
8. **Empty holder.** If the selected holder disappears from `holderGroups`
   after a filter change, clear it (today's `useMuseumFilter.ts:33` effect
   becomes a plain branch inside `reduce`).

### `components/Artifact/presentation.ts`

```ts
export const TAKEN_FROM = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';

export type Presentation = {
  title: string;
  image: string | undefined;
  primarySource: string | null;
  wikidataUrl: string | null;
  currentLocation: string;
  responsible: string | null;
};

export function presentation(
  card: ArtifactCard, hits: Record<string, ReviewWikidataHit>,
): Presentation;

export function labelForSourceUrl(url: string): string;  // moved verbatim
```

`ArtifactPane` drops from 13 props to 2 (`selected`, `hits`) plus the two nav
callbacks it forwards — 4 total. Its children call `presentation` themselves or
receive the single `Presentation` object.

### `components/ReviewMap/reviewMapTypes.ts`

```ts
export type ReviewStatus = 'already' | 'new';   // 'fuzzy' removed
export function getReviewStatus(card: ArtifactCard): ReviewStatus;
export interface ReviewWikidataHit {
  qid: string; label: string; imageUrl?: string; wikidataUrl: string;
}
```

---

## 6. Prop changes

| Component | Before | After |
|---|---|---|
| `ArtifactPane` | 13 | 4 |
| `ArtifactHeader` | 6 | 4 (`count` instead of the whole `filteredArtifacts` array) |
| `ProvenanceReferences` | 4 | 2 (`selected`, `presentation`) |
| `LeftRail` | 6 | 7 — gains `visibleCount`, receives `filtered` and stops filtering internally |
| `ReviewMapLeaflet` | 5 | 5 — `focusCoords` replaced by `focusToken` + `focusCoords` |

**`LeftRail` fixes a live inconsistency.** It currently receives
`visibleArtifacts` and filters again internally (`LeftRail.tsx:45`, the third
copy of that predicate), while its header renders the *global* count beside a
per-holder list. After the change it receives `filtered` for the list and
`visibleCount` for the header, so the two numbers on screen agree.

Its heading copy changes from `{n} institutions` to `{n} holders` per
`CONTEXT.md`.

---

## 7. Renames

Every `museum` identifier becomes `holder`:

```
selectedMuseum   -> selectedHolder     museumGroups  -> holderGroups
onSelectMuseum   -> onSelectHolder     MuseumGroup   -> HolderGroup
useMuseumFilter  -> (deleted)          handleSelectMuseum -> dispatch selectHolder
```

`UNKNOWN_HOLDER` already has the right name and keeps its value,
`'Unknown / Unresolved'`.

---

## 8. Acceptance

- `npx tsc --noEmit` clean; `npm run build` clean; `npm run lint` clean.
- Selecting a holder, then clicking an artifact in the rail, frames **that
  artifact** — the camera does not fly back to the holder. (Bug 1.)
- Selecting a holder whose artifacts are returned flies to Addis Ababa, where
  the pins are. (Bug 2.)
- Arriving at `/review?wpId=X` where X is a weak link selects and shows X;
  toggling a filter keeps X reachable; clicking another artifact drops it from
  the list and from the holder's count.
- The rail header count and the pane's `n / total` agree at all times.
- No `setSelected*`, `setShow*` or `setMobile*` crosses the session interface.
- `npm test` green, with `reviewSession` covering rules 1–8 in §5.
