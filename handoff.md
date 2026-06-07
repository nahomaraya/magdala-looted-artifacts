
# Project handoff: Prince and the Plunder → Wikidata

## Goal
Bulk-import ~700 looted Ethiopian artifacts catalogued at https://www.theprinceandtheplunder.com/ into Wikidata under [WikiProject Looted Heritage](https://www.wikidata.org/wiki/Wikidata:Wikiproject_Looted_heritage) (project Q-ID: **Q124538244**, marker property: **P5008**).

Reference item already created: https://www.wikidata.org/wiki/Q135517563 — match this schema for new items.

## Architecture (three decoupled stages)

```
1. HARVEST    → harvest.py     (WP REST API → local JSON mirror + Wayback snapshots)
2. TRANSFORM  → OpenRefine     (reconcile strings to Q-IDs, build schema)
3. UPLOAD     → QuickStatements (paste TSV at quickstatements.toolforge.org)
```

Decision: **use QuickStatements, not a custom bot** — community-recognized tool, handles rate limiting, doesn't need bot flag approval at this scale.

## Data source structure

theprinceandtheplunder.com runs WordPress 6.9.4 with the REST API enabled. Endpoints used:
- `/wp-json/wp/v2/posts` — one post per artifact (~706 total)
- `/wp-json/wp/v2/categories` — artifact types → P31 (instance of)
- `/wp-json/wp/v2/tags` — current holding institution → P195 (collection)

Each post body uses a consistent template:
```
<p><strong>What:</strong> ...description... </p>
<p><strong>Where:</strong> ...address/institution... </p>
<p>...commentary with source links (Internet Archive / museum DBs)...</p>
```

Title with trailing `*` = weaker provenance link (flag as such in output).

## Status: where we are

**Done:**
- `harvest.py` written and run by the user. Outputs: `posts.json`, `categories.json`, `tags.json`, `artifacts.csv`, `snapshots.jsonl`, `raw_pages/`.
- Tag and category structure analyzed. ~60 unique institutions, top 14 by volume hand-verified to Q-IDs (see seed table below).
- `lookup_qids.py` written to suggest Q-IDs for the remaining tags/categories via Wikidata's `wbsearchentities` API.
- Two SPARQL queries written for surveying existing related items.

**Next up:**
- User to run `lookup_qids.py` on tags.json and categories.json, review the TSVs, lock in the institutional Q-ID mapping.
- Build category → P31 mapping (the tree has parents, so often *two* properties: instance of + genre).
- Generate the QuickStatements TSV.
- Test with 5 items first, then batches of 50–100.

## Hand-verified institutional Q-IDs (seed)

```
British Library                                    Q23308   (360 items)
British Museum                                     Q6373    (70)
Victoria & Albert Museum - London                  Q213322  (34)
The King's Own Royal Regiment Museum - Lancaster   Q7758162 (18)
National Museums of Scotland                       Q1409919 (16)
National Army Museum - London                      Q1967107 (15)
Cambridge University Library                       Q1276477 (13)
Bodleian Library - Oxford                          Q220492  (11)
Britain's Royal Collection                         Q5589    (10)
Pitt Rivers Museum - Oxford                        Q1535306 (9)
Royal Engineers Museum                             Q7374023 (6)
John Rylands Library - Manchester                  Q633746  (5)
Wellcome Collection - London                       Q1781025 (6)
Duke of Wellington's Regimental Museum             Q5314342 (5)
```

Also useful: **P8565** = British Museum object ID (mappable directly from collection URLs).

## Special-case tags (do NOT auto-map to a single institution Q-ID)

- `Returned plunder` (8) — needs `previously held by` qualifier; current location is Ethiopian
- `Unknown` (38) — leave collection statement off entirely
- `Private collection` / `Unnamed buyer` — map to Q768717 (private collection), no holder
- `A bank vault in Portugal` — keep as plain text, no Q-ID
- `ca`, `LIbrar`, `Perth Museu` (count 0) — typo dupes, ignore

## Category quirks

Some categories aren't artifact types, they're site-organization labels — use as **filters/qualifiers**, not P31 values:
- `Features`, `News`, `People`, `The Story`, `Uncategorized` → skip these posts entirely
- `Strong link to Maqdala`, `Clear link to Maqdala`, `Possible link to Maqdala`, `Suspected Magdala plunder` → use as confidence indicator on the looting event statement (qualifier `nature of statement` = disputed for "Possible"/"Suspected")

Real artifact-type categories have parent IDs: e.g. cat 36 "Biblical books" has parent 6 "Manuscripts". Right Wikidata pattern is usually `P31 = manuscript (Q87167)` + `P136 = biblical text` rather than picking one.

## Target schema (per item)

Based on Q135517563:
```
Label (en):       <title> (with trailing * stripped)
Description (en): Ethiopian <category> looted from Maqdala in 1868, now at <location>

P31  (instance of)         = mapped category Q-ID
P195 (collection)          = mapped tag Q-ID
P495 (country of origin)   = Q115 (Ethiopia)
P361 (part of)             = Maqdala plunder collection (create if missing)
P5008 (on focus list of)   = Q124538244 (WikiProject Looted Heritage)
P793 (significant event)   = Q192623 (looting)
   qualifier P585 (point in time)    = 1868
   qualifier P2348 (time period)     = Q947667 (Battle of Magdala)
P217 (inventory number)    = extracted from source URLs where possible

References on every statement:
  S854 (reference URL) = the prince-and-plunder post URL
  S813 (retrieved)     = today's date
  + S854 for each source_link found in the post body
```

## Useful SPARQL queries

**Survey existing items (combines project membership + Magdala looting event):**

```sparql
SELECT ?item ?itemLabel ?itemDescription
       (GROUP_CONCAT(DISTINCT ?source;               separator=" | ") AS ?sources)
       (GROUP_CONCAT(DISTINCT ?instanceOfLabel;      separator="|") AS ?instance_of)
       (GROUP_CONCAT(DISTINCT ?collectionLabel;      separator="|") AS ?collection_P195)
       (GROUP_CONCAT(DISTINCT ?countryOfOriginLabel; separator="|") AS ?country_of_origin_P495)
       (GROUP_CONCAT(DISTINCT ?creatorLabel;         separator="|") AS ?creator_P170)
       (GROUP_CONCAT(DISTINCT ?materialLabel;        separator="|") AS ?material_P186)
       (GROUP_CONCAT(DISTINCT ?inceptionStr;         separator="|") AS ?inception_P571)
       (GROUP_CONCAT(DISTINCT ?locationLabel;        separator="|") AS ?location_P276)
       (GROUP_CONCAT(DISTINCT ?partOfLabel;          separator="|") AS ?part_of_P361)
       (GROUP_CONCAT(DISTINCT ?inventoryNumber;      separator="|") AS ?inventory_no_P217)
WHERE {
  {
    SELECT DISTINCT ?item ?source WHERE {
      { ?item wdt:P5008 wd:Q124538244 .
        BIND("WikiProject Looted Heritage" AS ?source) }
      UNION
      { ?item p:P793 ?statement .
        ?statement ps:P793 wd:Q192623 ;
                   pq:P585 ?time ;
                   pq:P2348 wd:Q947667 .
        FILTER(YEAR(?time) = 1868)
        BIND("Battle of Magdala 1868" AS ?source) }
    }
  }
  OPTIONAL { ?item wdt:P31  ?instanceOf .      ?instanceOf      rdfs:label ?instanceOfLabel      . FILTER(LANG(?instanceOfLabel)="en") }
  OPTIONAL { ?item wdt:P195 ?collection .      ?collection      rdfs:label ?collectionLabel      . FILTER(LANG(?collectionLabel)="en") }
  OPTIONAL { ?item wdt:P495 ?countryOfOrigin . ?countryOfOrigin rdfs:label ?countryOfOriginLabel . FILTER(LANG(?countryOfOriginLabel)="en") }
  OPTIONAL { ?item wdt:P170 ?creator .         ?creator         rdfs:label ?creatorLabel         . FILTER(LANG(?creatorLabel)="en") }
  OPTIONAL { ?item wdt:P186 ?material .        ?material        rdfs:label ?materialLabel        . FILTER(LANG(?materialLabel)="en") }
  OPTIONAL { ?item wdt:P571 ?inception . BIND(STR(?inception) AS ?inceptionStr) }
  OPTIONAL { ?item wdt:P276 ?location .        ?location        rdfs:label ?locationLabel        . FILTER(LANG(?locationLabel)="en") }
  OPTIONAL { ?item wdt:P361 ?partOf .          ?partOf          rdfs:label ?partOfLabel          . FILTER(LANG(?partOfLabel)="en") }
  OPTIONAL { ?item wdt:P217 ?inventoryNumber }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
GROUP BY ?item ?itemLabel ?itemDescription
ORDER BY ?itemLabel
```

Note: combining UNION + many OPTIONALs in a single block caused `StackOverflowError` in WDQS — the subquery wrap above fixes it.

## Files the user has locally

```
harvest.py           # the harvester
README.md            # pipeline docs
lookup_qids.py       # Q-ID suggester
harvest/             # output dir from running harvest.py
├── posts.json
├── categories.json
├── tags.json
├── artifacts.csv    # ← main work product
├── snapshots.jsonl
└── raw_pages/
```

## Politeness budget (already enforced in scripts)

- WP API: 1s between calls
- Wayback SPN: 6s between calls (their ~10/min unofficial limit)
- Wikidata API: 0.5s between calls
- All scripts use identifying User-Agent — user should replace `YOUR_EMAIL_HERE` with real email

## Open questions / decisions for next session

1. **De-duplication against existing items** — run the survey SPARQL above, match titles against `artifacts.csv` before generating new items. Don't want to create dupes of Q135517563-style items already done.
2. **Maqdala plunder collection item** — does a parent collection item exist on Wikidata to use for P361? If not, create one first.
3. **"What:" / "Where:" text usage** — currently parsed into separate CSV columns. Decide whether to use as item *description* or as free-text qualifier on the collection statement.
4. **Source links in the post body** — these point to Internet Archive scans of 19th-century catalogues *and* live museum DB pages. Both go in as `S854 (reference URL)` on the looting-event statement. The Wayback snapshots in `snapshots.jsonl` give us archive URLs as a fallback.

