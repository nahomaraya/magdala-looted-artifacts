# Handoff: source artifacts from Wikidata (not Airtable)

> Wikidata is the only source, as of this change. The Airtable and CSV loaders, dedup and the `ARTIFACT_SOURCE` switch are removed (along with the `dedup`, `airtableId`, `datePublished`, `maqdalaConfidence` and `isReviewable` card fields). The rest of this document is the original handoff; references to those pieces are historical.

**Audience:** the engineer/agent implementing this refactor.
**Status:** ready to start. Investigation done; this doc is the spec.
**Author context:** written 2026-06-07 after fixing the QuickStatements P31/P276
QIDs (see `data/QID_REVIEW_categories.md` and `data/QID_REVIEW_locations.md`).

---

## 1. Goal

Make **Wikidata the source of truth** for the `/review` map and `/looted-library`
pages. Today they read from Airtable via `lib/getReviewArtifacts.ts`. After this
refactor they read from Wikidata via **bulk SPARQL**, cached on Vercel.

Items are being minted into Wikidata from `data/artifacts.qs` (QuickStatements),
carrying: `P31` (instance of), `P276` (location), `P195` (collection), `P793`
(looting event, qualified by `P2348`=Battle of Magdala `Q947667` and `P585`=1868),
`P973` (described at URL — the Prince-and-Plunder post URL, our join key), and
`P5008` (WikiProject Looted Heritage `Q124538244`).

### Non-goals
- Do **not** change the `ArtifactCard` type shape — downstream components
  (`components/ReviewMap/*`, `components/Library/*`) must keep working unchanged.
- Do **not** touch `lib/wikidata.ts` `getAllArtifacts()` (the separate story-map
  provenance view — different shape, different pages).
- No in-app editing/writes in this pass (reads only).

---

## 2. Architecture decisions (already made — do not relitigate)

- **Source of truth = Wikidata.** Writes already go there via QuickStatements.
- **Runtime backend = a cached read replica rebuilt from Wikidata.** We do *not*
  query WDQS live per request (rate limits ~60 q/min/IP shared; 60s timeout;
  downtime; latency). We do *not* use Airtable as a runtime backend (that would
  create a second source of truth + a sync pipeline).
- **Hosting = Vercel.** Cache via Next.js Data Cache (`unstable_cache` + tags) or
  a build-time/ISR snapshot. A `/api/revalidate` route rebuilds on demand after a
  minting batch. Toolforge is NOT needed for this scale (~600 items).
- **Efficiency = O(1) queries, not O(N).** Discover QIDs in one query, then
  project all fields in a few chunked `VALUES` queries with `GROUP_CONCAT`. No
  per-item REST calls (that N+1 pattern is what makes `getAllArtifacts` slow).

---

## 3. Field mapping: Wikidata → `ArtifactCard`

`ArtifactCard` is defined in `lib/types.ts`. Fill it as follows:

| `ArtifactCard` field | Wikidata source | Notes |
|---|---|---|
| `wpId` | the **QID** | stable id; replaces the Airtable wp_id |
| `slug` | derived from `P973` path | e.g. last URL segment; or `''` |
| `url` | `wdt:P973` | the post URL |
| `title` | `rdfs:label` (label service) | en, fallback `mul,am` |
| `weakLink` | `p:P793 → pq:P5102` present (disputed claim `Q18912752`) | true if the looting statement is qualified disputed |
| `what` | `schema:description` / `itemDescription` | optional |
| `where` | primary holder label | optional (also in `holder.name`) |
| `imageUrls` | `wdt:P18` → `Special:FilePath` URL | use the URL **directly** (`?width=480` for thumbs); no Commons API call |
| `sourceLinks` | reference URLs `pr:P854` on `P793`/`P973` (optional) | fallback to `[url]` if none |
| `datePublished` | — | no WD equivalent; leave `undefined` |
| `returned` | true if any `P276`/`P195` == `Q2652168` (National Museum of Ethiopia) | keeps the "Returned to Ethiopia" toggle working — see §7 |
| `returnedDate` | — | optional; `P276` qualifier if present |
| `holder` / `allHolders` | `wdt:P276` (location) + `wdt:P195` (collection) | `ResolvedHolder`: `{ name (label), qid, coords (from holder `P625`), rawName, source:'wikidata' }` |
| `primaryCategory` / `allCategories` | `wdt:P31` (+ labels) | `ResolvedCategory`: `{ name, qid, rawName, source:'wikidata', isCompound/isQualifier/isSkip:false }`; skip `Q851304` (the universal "looted art") or keep as a category — decide (see §8) |
| `maqdalaConfidence` | `pq:P5102` value mapped back to strong/clear/possible/suspected | optional; only "disputed" is currently emitted, so may always be null |
| `isReviewable` | `true` | everything sourced from WD is reviewable |
| `dedup` | `{ exists:true, qid, method:'p973', confidence:100 }` | constant; dedup is moot when WD is the source |

---

## 4. Reusable code already in the repo

- `lib/dedup.ts` → `sparqlPost(query)` — **POST** SPARQL helper with **429
  backoff** and chunking. ⚠️ currently module-private; **extract it** to a shared
  `lib/utils/sparql.ts` and import from both places (Task 1).
- `lib/dedup.ts` → `checkP973Batch(urls)` — pattern for chunked VALUES + TTL cache.
- `lib/wikidata.ts` → `discoverArtifactQIDs()` (exported), `parseWktCoords()`
  (exported), `runSparql()` (GET-based; prefer the POST helper for big queries).
- `lib/utils/batchFetchBasicData.ts` — closest existing model for the new
  projection fetcher (chunks of 50, `GROUP_CONCAT`, label service).
- Constants in `lib/constants.ts`: `PROJECT_QID` (`Q124538244`), `LOOTING_QID`
  (`Q192623`), `MAQDALA_BATTLE_QID` (`Q947667`), `P_DESCRIBED_AT_URL` (`P973`),
  `ADDIS_ABABA_COORDS`, `SPARQL_ENDPOINT`, `USER_AGENT`.
- `components/ReviewMap/reviewMapUtils.ts` → `isReturnedArtifact()` already
  matches a holder named "National Museum of Ethiopia", so returned detection
  keeps working with WD-sourced holders.

---

## 5. Draft SPARQL (validate in the WDQS UI first — https://query.wikidata.org)

> These are starting points. **Run each in WDQS and tune** before wiring in.
> Watch for the label-service × `GROUP_CONCAT` row-multiplication trap: only let
> the label service label the **item itself**; concatenate *other* entities as
> bare QIDs and resolve their labels separately.

### Q1 — discovery (Maqdala-scope item QIDs)
```sparql
SELECT DISTINCT ?item WHERE {
  { ?item wdt:P5008 wd:Q124538244 . }
  UNION
  { ?item p:P793 ?st .
    ?st ps:P793 wd:Q192623 ;
        pq:P2348 wd:Q947667 . }
  UNION
  { ?item p:P793 ?st .
    ?st ps:P793 wd:Q192623 ;
        pq:P585 ?date .
    FILTER(YEAR(?date) = 1868) }
}
```

### Q2 — per-item projection (chunk QIDs into `VALUES`, ~150/query)
```sparql
SELECT ?item ?itemLabel ?itemDescription ?article
       (GROUP_CONCAT(DISTINCT ?type;       separator="|") AS ?types)
       (GROUP_CONCAT(DISTINCT ?image;      separator="|") AS ?images)
       (GROUP_CONCAT(DISTINCT ?confidence; separator="|") AS ?confidences)
WHERE {
  VALUES ?item { wd:Q111 wd:Q222 }   # <- inject chunk
  OPTIONAL { ?item wdt:P973 ?article }
  OPTIONAL { ?item wdt:P18  ?image }
  OPTIONAL { ?item wdt:P31  ?type }
  OPTIONAL { ?item p:P793 ?st . ?st ps:P793 wd:Q192623 . OPTIONAL { ?st pq:P5102 ?confidence } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,am". }
}
GROUP BY ?item ?itemLabel ?itemDescription ?article
```

### Q3 — holders (one row per item×holder; group in JS to keep per-holder coords)
```sparql
SELECT ?item ?holder ?holderLabel ?coords ?rel WHERE {
  VALUES ?item { wd:Q111 wd:Q222 }   # <- inject chunk
  { ?item wdt:P276 ?holder . BIND("P276" AS ?rel) }
  UNION
  { ?item wdt:P195 ?holder . BIND("P195" AS ?rel) }
  OPTIONAL { ?holder wdt:P625 ?coords }   # WKT "Point(lon lat)" — parse with parseWktCoords()
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

### Q4 — category labels (optional; resolve the distinct P31 QIDs once)
Either a tiny `VALUES` label query over the distinct `?type` QIDs, or reuse the
local `data/categories_qids_filled.tsv` name map.

> **References / `sourceLinks`** (optional, can defer): add
> `?item p:P973 ?s . ?s prov:wasDerivedFrom/pr:P854 ?refUrl` and `GROUP_CONCAT`.

---

## 6. Tasks

### Phase 0 — validate data (do this before coding)
- [ ] Run **Q1** in WDQS; confirm it returns the expected count (cross-check
      against `grep -c '^CREATE' data/artifacts.qs`, currently 616, minus
      not-yet-minted).
- [ ] Run **Q2** and **Q3** on a 5–10 QID sample; confirm labels, P31, holder +
      coords, image URLs look right. Tune for row-multiplication if needed.

### Phase 1 — shared SPARQL util
- [ ] Create `lib/utils/sparql.ts`; move `sparqlPost` (+ `sleep`, `qidFromUri`)
      out of `lib/dedup.ts`; re-export from `dedup.ts` to avoid churn. Acceptance:
      `npm run build`/`tsc` clean; dedup still works.

### Phase 2 — the fetcher
- [ ] Create `lib/getWikidataArtifacts.ts` exporting
      `getWikidataArtifacts(): Promise<ArtifactCard[]>`.
- [ ] Implement `batchFetchArtifactCards(qids)`: chunk (~150), run Q2 + Q3 (+Q4)
      via `sparqlPost`, assemble `ArtifactCard[]` per §3.
- [ ] Image URLs: keep the `Special:FilePath` URL as-is (no `resolveCommonsImage`).
- [ ] Coords: `parseWktCoords()` on holder `P625`.
- [ ] Acceptance: returns a non-empty `ArtifactCard[]`; spot-check 3 known items
      match WD; total SPARQL round-trips = `2–3 + ceil(N/150)`, **no per-item calls**.

### Phase 3 — caching (Vercel)
- [ ] Wrap the fetch in `unstable_cache(fn, ['wd-artifacts'], { revalidate: 3600,
      tags: ['wd-artifacts'] })` **or** use a build-time/ISR snapshot.
      ⚠️ Vercel Data Cache has a **~2 MB per-entry limit** — if the full payload is
      near it, store a lean projection or split keys (or use the ISR-snapshot route).
- [ ] Add `app/api/revalidate/route.ts` (POST, guarded by a secret env, e.g.
      `REVALIDATE_SECRET`) calling `revalidateTag('wd-artifacts')`.
- [ ] (Optional) `vercel.json` cron to revalidate daily.
- [ ] Acceptance: second page load does not hit WDQS; hitting the revalidate
      route forces a fresh pull.

### Phase 4 — migration toggle (removed)
The `ARTIFACT_SOURCE` switch (`wikidata | airtable | merge`) and `lib/artifactSource.ts`
were removed once Wikidata became the only source. `app/map/page.tsx` and
`app/page.tsx` call `getWikidataArtifacts()` directly (`/review` now redirects
to `/map`; `lib/getLibraryArtifacts.ts` is gone).

### Phase 5 — verify downstream is untouched
- [ ] `/review`: pins render at holder coords; **returned items show in Addis**
      (holder = National Museum of Ethiopia → `isReturnedArtifact` true → existing
      `ADDIS_ABABA_COORDS` override in `components/ReviewMap/ReviewMapLeaflet.tsx`).
- [ ] "Returned to Ethiopia" toggle, museum rail, weak-link toggle, and the
      `?wpId=` deep-link from the library still work (note: `wpId` is now a QID).
- [ ] `/looted-library`: book-type classification still works
      (`lib/libraryBookTypes.ts` reads `allCategories[].name` — ensure WD P31
      labels populate `name`, e.g. "manuscript", "biblical text").
- [ ] `tsc` + `eslint` clean.

---

## 7. Returned-to-Ethiopia behavior (keep intact)
The map already special-cases returned items: `isReturnedArtifact()` in
`components/ReviewMap/reviewMapUtils.ts` returns true when `returned` is set, a
category matches "Returned plunder", **or a holder is named "National Museum of
Ethiopia"**, and `ReviewMapLeaflet.tsx` plots those at `ADDIS_ABABA_COORDS`. Since
WD holders carry that label (`Q2652168`), this keeps working — just make sure the
holder `name` is the English label and `returned` is set per §3.

---

## 8. Open decisions for the implementer (pick + note in the PR)
1. **`Q851304` ("looted art")** is on every item as `P31`. Filter it out of
   `allCategories`, or keep it as a generic category? (Recommend filter; it's not
   a meaningful artifact type for the UI.)
2. **`merge` mode** — dropped; Wikidata is the only source.
3. **`maqdalaConfidence`** — only "disputed" (`P5102`) is currently emitted, so
   the 4-level confidence may always resolve to null/weak. Confirm what's actually
   on the minted items and decide whether to keep the field meaningful.
4. **Library membership** — `getLibraryArtifacts` filters by category name regex
   for book/manuscript. Confirm WD P31 labels (e.g. "manuscript") satisfy that
   regex, or switch the filter to QID-based (`Q87167` etc.).

---

## 9. Gotchas
- **WDQS 60s timeout** → discover-then-chunk; never one giant query.
- **Label service × GROUP_CONCAT** → only label the item; concat other entities
  as QIDs (Q4 / local map for labels).
- **Multiple holders** → Q3 returns one row per holder; group in JS so each keeps
  its own coords (don't collapse to a single holder in SPARQL).
- **Coords are WKT** `Point(lon lat)` — lon first; use `parseWktCoords()`.
- **Vercel Data Cache ~2 MB/entry** — see Phase 3.
- **Module caches don't survive cold starts on Vercel** — that's why we use
  `unstable_cache`/ISR, not in-process module caches.
- **Not-yet-minted items** do not appear; there is no fallback source.

---

## 10. Definition of done
- `/review` and `/looted-library` render entirely from Wikidata, cached, with no per-item REST calls and no Airtable in the read path.
- Returned items appear in Addis Ababa; toggles, rail, deep-links, and library
  book-type filters all work unchanged.
- A documented way to refresh the cache after a minting batch (`/api/revalidate`).
- `tsc` + `eslint` clean; PR notes the §8 decisions taken.
