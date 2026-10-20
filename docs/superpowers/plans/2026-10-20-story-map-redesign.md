# Story Map Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single review map into a Dura-Europos-style story site — a scrolling front page at `/` and a full-screen, View-switching story map at `/map` — reading only from Wikidata.

**Architecture:** Four stages, each shippable on its own: (A) Wikidata-only data layer with return events, holder countries and legacy-link redirects; (B) the `/map` shell with a View sidebar (Dispersal, Library) and the review session lifted above it; (C) Leaflet → MapLibre GL on OpenFreeMap tiles; (D) the front page. Logic that can be wrong lives in pure, Vitest-tested modules under `lib/` and `components/StoryMap/`; React components stay thin.

**Tech Stack:** Next.js 16.2.3 (App Router), React 19.2.4, TypeScript 5, Tailwind 4, Vitest 3 (node env), maplibre-gl 5 + react-map-gl 8 (new, Stage C), Python 3 (one data script).

**Spec:** `docs/superpowers/specs/2026-10-20-story-map-redesign-design.md`. Glossary: `CONTEXT.md`.

**Branch:** work on `feat/story-map-redesign`, not `main`.

## Global Constraints

- Domain words from `CONTEXT.md`: **holder** (never museum/institution in new names or copy), **Maqdala** (never "Magdala" except inside "Battle of Magdala"), **returned**, **repatriation**, **View**, **featured**, **pinned**, **dispersal**.
- Copy is neutral and factual: no advocacy wording, no unsourced claims.
- Styling: Tailwind only, using the existing `@theme` tokens in `app/globals.css` (`navy`, `navy-light`, `navy-border`, `gold`, `gold-dim`, `parchment`, `parchment-dim`, `looting`, `location`) and `font-heading` / `font-body`. No Material UI, no new fonts.
- `UNKNOWN_HOLDER` stays exactly `'Unknown / Unresolved'`.
- `ArtifactCard.wpId` keeps its name but holds the artifact's **QID** from Task 1 on (renaming it is out of scope). Comment it as such in `lib/types.ts`.
- Every request to Wikidata/Commons sends the `USER_AGENT` header from `lib/constants.ts`.
- Verified IDs (do not substitute): return event `Q65088609`, point in time `P585`, country `P17`, National Museum of Ethiopia `Q2652168`, looted art `Q851304`.
- OpenFreeMap style URL: `https://tiles.openfreemap.org/styles/liberty`.
- Hero Commons categories, exactly: `Battle of Magdala`, `British Expedition to Abyssinia`.
- Out of scope for this plan: the Gallery and Wikidata statements Views, the 3D Maqdala.
- After each task: `npm test`, `npx tsc --noEmit`, `npm run lint` pass. After Tasks 3, 7, 8 and 12 also `npm run build`.

## Review Focus

1. **Wikidata or Commons is slow or down** — `/` must still render: a Commons failure gives a collage of featured images only (log, don't throw). Test: Task 9 (`getHeroImages` swallows a failed category).
2. **Lat/lng order when moving to MapLibre** — the app stores `[lat, lng]`; MapLibre takes `[lng, lat]`. A swapped pin lands in the ocean. Test: Task 8 `toLngLat`.
3. **Bad URL parameters** — unknown `?view=`, a `?qid=` not in scope, a `?wpId=` with no legacy match: fall back to the Dispersal View / no selection / plain `/map`, never a 500. Tests: Tasks 4 and 6.
4. **Non-free or unattributed Commons files** — files whose licence isn't public domain / CC0 / CC BY(-SA), or that lack licence metadata, are excluded; shown files always carry author + licence. Test: Task 9.
5. **Malformed or stale `content/pins.json`** — a pin whose QID isn't an artifact, a duplicated QID, a pin missing `qid`/`text`: skip silently, first occurrence wins. Tests: Task 10.

---

## Stage A — Wikidata-only data layer

### Task 1: Return events, holder countries, clean categories

**Files:**
- Create: `lib/wikidataCards.ts`, `lib/wikidataCards.test.ts`
- Modify: `lib/getWikidataArtifacts.ts`, `lib/types.ts` (`ResolvedHolder`, `ArtifactCard`), `lib/constants.ts`

**Interfaces:**
- Produces:
  - `lib/constants.ts`: `RETURN_EVENT_QID = 'Q65088609'`
  - `lib/types.ts`: `ResolvedHolder.country?: string`; `ArtifactCard.returnedDate?: string` (ISO `YYYY-MM-DD`, already declared — now filled)
  - `lib/wikidataCards.ts` (pure, no `next/*` imports): `export interface ItemFields` (moved from `getWikidataArtifacts.ts`, plus `returnDates: string[]` and `hasReturnEvent: boolean`), `export interface HolderRow` (moved, plus `country?: string`), `export function assembleCard(qid: string, f: ItemFields, holderRows: HolderRow[], typeLabels: Map<string, string>): ArtifactCard`, and the moved helpers `buildHolders`, `buildCategories`, `holderCoords`, `slugFromUrl`

- [ ] **Step 1: Write failing tests** in `lib/wikidataCards.test.ts`:
  - `it('marks an item with a return event as returned, with the latest date')` — `returnDates: ['1872-01-01T00:00:00Z', '2024-11-01T00:00:00Z']`, `hasReturnEvent: true` → `returned === true`, `returnedDate === '2024-11-01'`.
  - `it('marks a return event without a date as returned, undated')` → `returned === true`, `returnedDate === undefined`.
  - `it('does not mark an NME-held item without a return event as returned')` — holder row `{ qid: 'Q2652168', ... }`, `hasReturnEvent: false` → `returned === false`.
  - `it('drops looted art / looted property labels from categories')` — types `['Q1', 'Q2', 'Q3']`, labels `Q1→'looted property'`, `Q2→'manuscript'`, `Q3→'Looted Art'` → `allCategories.map(c => c.name)` equals `['manuscript']`, `primaryCategory?.name === 'manuscript'`.
  - `it('carries holder country through')` — holder row `country: 'United Kingdom'` → `holder?.country === 'United Kingdom'`.

- [ ] **Step 2: Run** `npx vitest run lib/wikidataCards.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement.**
  - Move `ItemFields`, `HolderRow`, `bindingToItemFields`, `buildHolders`, `buildCategories`, `holderCoords`, `slugFromUrl` into `lib/wikidataCards.ts`; extract the per-card body of `fetchWikidataArtifacts` into `assembleCard`. `returned = f.hasReturnEvent`; `returnedDate` = max of `returnDates` sliced to 10 chars.
  - `buildCategories` filters out labels matching `/^looted (art|property)$/i`.
  - Q2 in `fetchItemFields` adds `OPTIONAL { ?item p:P793 ?rs . ?rs ps:P793 wd:${RETURN_EVENT_QID} . OPTIONAL { ?rs pq:P585 ?returnDate } }` with `(GROUP_CONCAT(DISTINCT ?rs; separator="|") AS ?returns)` and `(GROUP_CONCAT(DISTINCT ?returnDate; separator="|") AS ?returnDates)`; `hasReturnEvent = returns non-empty`.
  - Q3 in `fetchHolders` adds `OPTIONAL { ?holder wdt:P17 ?country }` and selects `?countryLabel`.
  - `NATIONAL_MUSEUM_ETHIOPIA_QID` is no longer used by the loader; leave the constant.

- [ ] **Step 4: Run** the test file — PASS. Run `npm test` — PASS.

- [ ] **Step 5: Commit** — `feat: read return events and holder countries from Wikidata`

### Task 2: Returned means a recorded return event

**Files:**
- Modify: `lib/repatriation.ts`
- Create: `lib/repatriation.test.ts`
- Modify: `components/ReviewMap/reviewSession.test.ts` (only if a fixture relied on the old heuristics)

**Interfaces:**
- Produces: `isReturned(card: ArtifactCard): boolean` → `card.returned === true`. `displayCoords` unchanged (returned → `ADDIS_ABABA_COORDS`, else `holder?.coords`).

- [ ] **Step 1: Write failing tests** in `lib/repatriation.test.ts`:
  - `it('is not returned just because the holder is the National Museum of Ethiopia')` — `returned: false`, holder name `'National Museum of Ethiopia'` → `isReturned === false`.
  - `it('is not returned from a "Returned plunder" category alone')`.
  - `it('pins a returned artifact with no holder at Addis Ababa')` — `returned: true, holder: null` → `displayCoords` equals `ADDIS_ABABA_COORDS`.
  - `it('pins a non-returned artifact at its holder')`.
- [ ] **Step 2: Run** `npx vitest run lib/repatriation.test.ts` — the first two FAIL.
- [ ] **Step 3: Implement** — replace the body of `isReturned`; delete the two regex constants and update the doc comment.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `refactor: returned is a recorded return event`

### Task 3: Remove Airtable, CSV loaders, dedup and the source switch

**Files:**
- Delete: `lib/airtable.ts`, `lib/artifactSource.ts`, `lib/getReviewArtifacts.ts`, `lib/dedup.ts`, `lib/utils/loadArtifactsCsv.ts`, `lib/utils/loadArtifactsFromAirtable.ts`, `lib/utils/loadCategoriesFromAirtable.ts`, `lib/utils/loadCategoriesTsv.ts`, `lib/utils/loadMuseumsCsv.ts`, `lib/utils/loadMuseumsFromAirtable.ts`, `lib/utils/loadTagsCsv.ts`, `lib/utils/loadTagsFromAirtable.ts`, `lib/utils/parseCsv.ts`, `lib/utils/tokenSortRatio.ts`, `app/api/airtable/`, `app/api/artifacts/returned/`, `components/Artifact/DedupBadge.tsx`
- Modify: `lib/types.ts`, `lib/getLibraryArtifacts.ts`, `app/review/page.tsx`, `app/api/artifacts/[qid]/route.ts`, `components/ReviewMap/{index,LeftRail,MobileHeader,MobileDetails,ReviewMapLeaflet,reviewMapTypes,reviewSession.test}.ts(x)`, `components/Artifact/{ArtifactPane,ArtifactHeader,presentation,index}.ts(x)`, `README.md`, `docs/wikidata-source-refactor.md`

**Interfaces:**
- Produces:
  - `ArtifactCard` without `airtableId`, `datePublished`, `maqdalaConfidence`, `isReviewable`, `dedup`. Delete `DedupResultLite`, `MaqdalaConfidence`, `TagEntry`, `CategoryEntry` if nothing else imports them (keep `QidSource`).
  - `presentation(card: ArtifactCard): Presentation` — no `hits` argument; `title = card.title`, `image = card.imageUrls[0]`, `wikidataUrl = \`https://www.wikidata.org/wiki/${card.wpId}\``.
  - The `wikidataHits` / `hits` props and `ReviewWikidataHit` are removed from every component; `reviewMapTypes.ts` is deleted (`getReviewStatus` goes with it).
  - Pages read `getWikidataArtifacts()` directly.

- [ ] **Step 1:** Update `reviewSession.test.ts`'s `card()` fixture to the new `ArtifactCard` shape (drop the removed fields). Run `npm test` — it still PASSES (type errors only surface in `tsc`).
- [ ] **Step 2:** Delete the files listed above and remove the fields from `lib/types.ts`. Run `npx tsc --noEmit` — expect errors listing every caller.
- [ ] **Step 3:** Fix each caller to the Produces shapes above. In `ReviewMapLeaflet.tsx`, every pin uses `gold` (`#daa520`); the Addis Ababa group uses `location` (`#52b788`). Delete LeftRail's `dup` span. Drop `getReviewArtifacts` and the `console.log` from `app/api/artifacts/[qid]/route.ts`. In `README.md` / `docs/wikidata-source-refactor.md`, remove `ARTIFACT_SOURCE` and the Airtable setup, and add one line: Wikidata is the only source, as of this change.
- [ ] **Step 4: Verify** `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build` all pass; `npm run dev` → `/` shows the map with pins and the details pane opens on a click.
- [ ] **Step 5: Commit** — `refactor!: Wikidata is the only artifact source`

### Task 4: Legacy `?wpId=` links resolve to QIDs

**Files:**
- Create: `data/build_legacy_wpids.py`, `lib/legacyWpIds.json` (generated, committed), `lib/legacyLinks.ts`, `lib/legacyLinks.test.ts`

**Interfaces:**
- Produces: `resolveLegacyWpId(wpId: string, cards: ArtifactCard[], legacy: Record<string, string>): string | null` — returns the QID (`card.wpId`) whose `url` matches `legacy[wpId]` (compare trimmed, trailing slashes removed, lower-cased), else `null`.

- [ ] **Step 1: Write failing tests** — match despite a trailing slash / case difference; `null` for an unknown wpId; `null` when the mapped URL matches no card; `null` for a non-numeric wpId like `'Q12'`.
- [ ] **Step 2: Run** `npx vitest run lib/legacyLinks.test.ts` — FAIL.
- [ ] **Step 3: Implement** `lib/legacyLinks.ts`. Write `data/build_legacy_wpids.py`: read `data/artifacts.csv` with `csv.DictReader`, write `{wp_id: url}` for rows with both, sorted by key, to `lib/legacyWpIds.json` (2-space indent). Run it: `python data/build_legacy_wpids.py`.
- [ ] **Step 4: Run** the tests — PASS.
- [ ] **Step 5: Commit** — `feat: map legacy WordPress ids to Wikidata QIDs`

### Task 5: Details pane — QID and image placeholder

**Files:**
- Modify: `components/Artifact/ArtifactHeader.tsx`, `components/ReviewMap/MobileDetails.tsx` (if it renders the image)

**Interfaces:**
- Consumes: `presentation(card)` (Task 3).
- Produces: `ImagePlaceholder({ qid }: { qid: string })` in `components/Artifact/ImagePlaceholder.tsx`, reused by the front page (Task 12).

- [ ] **Step 1:** In `ArtifactHeader`, replace `WP #{selected.wpId}` with the QID linked to its Wikidata page.
- [ ] **Step 2:** When `presentation.image` is undefined, render `ImagePlaceholder`: a bordered `h-64` box with *"No image on Wikidata yet."* and a link *"Add one on Wikidata ↗"* to `https://www.wikidata.org/wiki/{qid}#P18`.
- [ ] **Step 3: Verify** `npm run dev`: an artifact with an image shows it; one without shows the placeholder and link; `npx tsc --noEmit` and `npm run lint` pass.
- [ ] **Step 4: Commit** — `feat: image placeholder and add-image link in the details pane`

---

## Stage B — `/map` and its Views

### Task 6: View model

**Files:**
- Create: `components/StoryMap/views.ts`, `components/StoryMap/views.test.ts`

**Interfaces:**
- Produces:
  - `export const VIEWS = ['map', 'library'] as const; export type ViewId = typeof VIEWS[number];`
  - `export const VIEW_LABELS: Record<ViewId, string>` = `{ map: 'Dispersal', library: 'Library' }`
  - `export function parseView(raw: string | undefined | null): ViewId` — unknown/empty → `'map'`
  - `export function mapHref(view: ViewId, qid: string | null): string` — `'/map'`, `'/map?view=library'`, `'/map?qid=Q1'`, `'/map?view=library&qid=Q1'` (omit `view` when `'map'`, omit `qid` when null)
  - `export function parseQid(raw: string | undefined | null): string | null` — `/^Q\d+$/` else `null`

- [ ] **Step 1: Write failing tests** for each example above, plus `parseView('Library')` → `'map'` (case-sensitive), `parseView('gallery')` → `'map'`, and `parseQid('123')` → `null`.
- [ ] **Step 2: Run** `npx vitest run components/StoryMap/views.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: View ids and /map URL helpers`

### Task 7: `/map` shell, View sidebar, Library View, redirects

**Files:**
- Create: `app/map/page.tsx`, `components/StoryMap/index.tsx`, `components/StoryMap/ViewNav.tsx`, `components/StoryMap/useViewUrl.ts`, `lib/library.ts`, `lib/library.test.ts`
- Modify: `components/ReviewMap/index.tsx` (takes the session from props), `components/ReviewMap/MobileMenu.tsx` (lists Views), `app/page.tsx`, `app/review/page.tsx`, `app/library/page.tsx`, `app/looted-library/page.tsx`
- Delete: `lib/getLibraryArtifacts.ts`

**Interfaces:**
- Consumes: Task 6 helpers; `resolveLegacyWpId` + `lib/legacyWpIds.json` (Task 4); `useReviewSession` (unchanged).
- Produces:
  - `lib/library.ts`: `isLibraryArtifact(card: ArtifactCard): boolean` (the current `/book|books|manuscript|manuscripts/` rule) and `libraryArtifacts(cards: ArtifactCard[]): ArtifactCard[]` (filtered, sorted by title, `en`, base sensitivity).
  - `components/StoryMap/index.tsx`: `default function StoryMap(props: { artifacts: ArtifactCard[]; initialView: ViewId; initialQid: string | null })` — owns `useReviewSession(artifacts, initialQid)` and the current `ViewId`, and renders `ViewNav` plus the active View.
  - `ReviewMap` props become `{ view: SessionView; dispatch: Dispatch<SessionAction> }`.
  - `useViewUrl(view: ViewId, qid: string | null): void` — `window.history.replaceState(null, '', mapHref(view, qid))` on change.
- Route behaviour:
  - `/map?wpId=N` (and no `qid`) → `redirect(mapHref(view, resolveLegacyWpId(...)))`.
  - `/review?wpId=N` → `redirect('/map?wpId=N')`; `/review` → `/map`.
  - `/library`, `/looted-library` → `/map?view=library`.
  - `/` → `redirect('/map')` **until Task 12** replaces it.

- [ ] **Step 1: Write failing tests** in `lib/library.test.ts`: matches category `'manuscript'`; rejects `'icon'`; `libraryArtifacts` sorts `'b', 'A', 'c'` → `'A', 'b', 'c'`.
- [ ] **Step 2: Run** — FAIL. **Step 3:** implement `lib/library.ts` — PASS.
- [ ] **Step 4: Build the shell.** Desktop: a fixed left column `w-52` (`bg-navy-light`, `border-navy-border`) with a "Looted from Maqdala" link to `/` in `font-heading`, then one button per View (active: `text-gold`, gold left border). Right of it, the active View fills the rest: `map` → `ReviewMap`; `library` → `LibraryGrid` with `libraryArtifacts(artifacts)`. Mobile: hide the column; `MobileMenu` lists the Views above the holder list. Selecting an artifact keeps the current View.
- [ ] **Step 5: Verify** `npm run build`; in `npm run dev`: `/` lands on `/map`; switching Views updates the URL without reloading; reloading `/map?view=library` opens the Library; `/map?view=nope` shows Dispersal; `/library` and `/review` redirect; `/map?wpId=<a real wp_id from data/artifacts.csv>` lands on that artifact.
- [ ] **Step 6: Commit** — `feat: /map story view with a View sidebar`

---

## Stage C — MapLibre

### Task 8: Replace Leaflet with MapLibre on OpenFreeMap

**Files:**
- Create: `components/ReviewMap/DispersalMap.tsx`, `components/ReviewMap/mapGeo.ts`, `components/ReviewMap/mapGeo.test.ts`, `components/ReviewMap/basemapStyle.ts`
- Delete: `components/ReviewMap/ReviewMapLeaflet.tsx`
- Modify: `components/ReviewMap/index.tsx`, `app/globals.css` (drop the Leaflet overrides), `package.json`, `docs/adr/0001-camera-precedence-stays-in-the-map-effect.md` (append an "Update 2026-10" line: the rule applies unchanged to `DispersalMap`)

**Interfaces:**
- Produces:
  - `mapGeo.ts`: `toLngLat([lat, lng]: [number, number]): [number, number]`; `groupsToGeoJSON(groups: GroupedLocation[], selectedQid: string | null): GeoJSON.FeatureCollection<GeoJSON.Point>` — properties `{ key, count, holder, selected: boolean, returned: boolean }`; move `groupByCoords` and `GroupedLocation` here from the old Leaflet file.
  - `basemapStyle.ts`: `restyleBasemap(map: maplibregl.Map): void` — sets background `#1a0e06`, water `#251406`, land/landcover/landuse `#2b190a`, roads/boundaries `#4a2c0e`, label text `#c8b89a` with halo `#1a0e06`, `building-3d` extrusion `#4a2c0e`; layers matched by id substring, missing layers skipped.
  - `DispersalMap` has the old component's props minus `wikidataHits`.
- Camera (inside the map component's effect, per ADR 0001):
  - holder picked (`focusToken` changed) → `flyTo({ center, zoom: 15, pitch: 55, bearing: -20, duration: 1500 })`
  - no selection → `flyTo({ center: toLngLat(MAGDALA_COORDS), zoom: 1.6, pitch: 0, bearing: 0 })`
  - selection → `fitBounds([Maqdala, selected], { padding: 70, pitch: 0, duration: 1000 })`
- Layers: Maqdala origin circle (`#e74c3c`, low fill); holder circles sized `7 + count / maxCount * 15` px, gold, returned group `#52b788`, selected group stronger stroke/opacity; a dashed `#e74c3c` line from Maqdala to the selected artifact. Hovering a pin opens a `Popup` with the holder name (the Addis Ababa returned group is titled "Returned to Ethiopia"), count and up to 8 clickable titles (`+N more`); a click selects the first artifact, as before.

- [ ] **Step 1: Write failing tests** — `toLngLat([11.2167, 39.3167])` → `[39.3167, 11.2167]`; `groupsToGeoJSON` emits `[lng, lat]` coordinates, `count`, `selected: true` only on the group holding the selected QID, `returned: true` for the Addis Ababa group.
- [ ] **Step 2: Run** — FAIL. **Step 3:** `npm i maplibre-gl@^5 react-map-gl@^8 && npm rm leaflet react-leaflet @types/leaflet`; implement `mapGeo.ts` — PASS.
- [ ] **Step 4:** Implement `DispersalMap` with `react-map-gl/maplibre` (`mapStyle="https://tiles.openfreemap.org/styles/liberty"`, `import 'maplibre-gl/dist/maplibre-gl.css'`, attribution control on), `restyleBasemap` on `load`; load it with `next/dynamic` `ssr: false` as before.
- [ ] **Step 5: Verify** `npm run build`; then ADR 0001's manual camera checks in `npm run dev`, plus: pins sit on London/Edinburgh/Addis Ababa (not in the sea); picking a holder flies in tilted with 3D buildings; the dashed line runs from Maqdala; the OpenFreeMap/OSM attribution shows.
- [ ] **Step 6: Commit** — `feat: MapLibre dispersal map on OpenFreeMap tiles`

---

## Stage D — Front page

### Task 9: Commons hero images

**Files:**
- Create: `lib/commonsImages.ts`, `lib/commonsImages.test.ts`

**Interfaces:**
- Produces:
  - `export const HERO_CATEGORIES = ['Battle of Magdala', 'British Expedition to Abyssinia'] as const;`
  - `export interface CommonsImage { title: string; thumbUrl: string; pageUrl: string; artist: string; license: string; category: string }`
  - `export function parseCommonsFiles(json: unknown, category: string): CommonsImage[]` — keeps only files whose `extmetadata.LicenseShortName.value` matches `/^(public domain|pd\b|cc0|cc by(-sa)?\b)/i`; `artist` = `Artist.value` with HTML tags stripped, `'Unknown'` when empty; drops files with no `imageinfo`.
  - `export async function getHeroImages(): Promise<CommonsImage[]>` — `unstable_cache`, revalidate 86400, tag `'commons-hero'`. For each category: `action=query&generator=categorymembers&gcmtitle=Category:<name>&gcmtype=file&gcmlimit=200&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json` on `COMMONS_API` (direct files only, no subcategories). Dedupe by `title`. A failed category is logged and contributes `[]`.

- [ ] **Step 1: Write failing tests** with a hand-written fixture: a PD file kept; a CC BY-SA 4.0 file kept; an "All rights reserved"/missing-licence file dropped; HTML artist stripped; empty artist → `'Unknown'`; `getHeroImages` returns the other category's images when one category's fetch rejects (mock `fetch`; mock `next/cache`'s `unstable_cache` as identity).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: free-licensed 1868 photographs from Commons`

### Task 10: Featured artifacts and pins

**Files:**
- Create: `content/pins.json` (`{ "pins": [] }` — the curator fills it), `lib/featured.ts`, `lib/featured.test.ts`

**Interfaces:**
- Produces:
  - `export interface Pin { qid: string; text: string }`
  - `export function parsePins(raw: unknown): Pin[]` — keeps entries with string `qid` matching `/^Q\d+$/` and string `text`; non-object/missing `pins` → `[]`.
  - `export interface FeaturedArtifact { card: ArtifactCard; image: string | null; pinText: string | null }`
  - `export function selectFeatured(cards: ArtifactCard[], pins: Pin[]): FeaturedArtifact[]` — pins first, in pin order (unknown QIDs skipped, first duplicate wins), then every non-pinned card with `imageUrls.length > 0`, sorted by holder name (no holder last), then title (`en`, base). `image = card.imageUrls[0] ?? null`.

- [ ] **Step 1: Write failing tests** — order (pinned without image first with `image: null` and its text, then imaged cards by holder then title); unknown pin QID skipped; duplicate pin uses the first text; a card with no image and no pin is excluded; `parsePins` drops `{ qid: 12 }`, `{ qid: 'Q1' }` (no text), and returns `[]` for `null`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: featured artifacts with curator pins`

### Task 11: Key numbers and recent repatriations

**Files:**
- Create: `lib/frontPageStats.ts`, `lib/frontPageStats.test.ts`

**Interfaces:**
- Produces:
  - `export function keyNumbers(cards: ArtifactCard[]): { artifacts: number; holders: number; returned: number; countries: number }` — `holders` = distinct non-null holder QIDs across every card's `allHolders`; `countries` = distinct non-empty `country` across the same; `returned` = `cards.filter(isReturned).length`.
  - `export function recentRepatriations(cards: ArtifactCard[], limit = 6): ArtifactCard[]` — returned cards, `returnedDate` descending, undated last, at most `limit`.

- [ ] **Step 1: Write failing tests** — two cards sharing a holder count as 1 holder; a holder with no QID is not counted; two holders in one country → 1 country; recent order `2024-11-01`, `1999-05-02`, undated; `limit` respected.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: key numbers and recent repatriations`

### Task 12: Front page at `/`

**Files:**
- Create: `components/Front/HeroCollage.tsx`, `components/Front/KeyNumbers.tsx`, `components/Front/FeaturedGrid.tsx`, `components/Front/RecentRepatriations.tsx`
- Modify: `app/page.tsx` (drop the Task 7 redirect), `app/layout.tsx` (description wording only, neutral)

**Interfaces:**
- Consumes: `getWikidataArtifacts`, `getHeroImages` + `CommonsImage` (Task 9), `selectFeatured` + `parsePins` (Task 10; import `content/pins.json`), `keyNumbers` + `recentRepatriations` (Task 11), `mapHref` (Task 6), `ImagePlaceholder` (Task 5).

- [ ] **Step 1: Build `app/page.tsx`** (server component, `force-dynamic`), a single scrolling column `max-w-6xl`, in this order:
  1. **HeroCollage** — up to 12 tiles, featured images first, then hero images; sepia-toned (`sepia` + slight `brightness`), dark `navy` gradient overlay; `h1` *"Looted from Maqdala"*, tagline *"Objects taken after the Battle of Magdala in 1868, and where they are held today."*, and a gold *"Explore the map"* button → `/map`. Below: a small credits line linking each Commons tile to its `pageUrl` with author and licence.
  2. **KeyNumbers** — four figures (Artifacts, Holders, Returned, Countries), `font-heading text-5xl text-gold`, labels `text-parchment-dim`.
  3. **FeaturedGrid** — cards: image or `ImagePlaceholder`, title, holder, `pinText` when pinned; each links to `mapHref('map', qid)`.
  4. **RecentRepatriations** — a horizontal strip: title, *"Returned {year}"* (first 4 chars of `returnedDate`, or *"Returned"* when undated), link to `/map?qid=…`.
  5. A footer line: *"Data from Wikidata (WikiProject Looted Heritage) and Wikimedia Commons."* with links.
- [ ] **Step 2: Verify** `npm run build`; in `npm run dev` at 1280px and 390px wide: no horizontal scroll; temporarily make `getHeroImages` reject and confirm the page still renders with featured images only; links land on the right artifact in `/map`.
- [ ] **Step 3: Commit** — `feat: Dura-Europos-style front page`
