# Story Map Redesign — Design

Agreed in a grilling session on 2026-10-20. Reference look:
https://dura-europos.stories.k2.services/ (its story page's sidebar-of-views
layout and its scrolling home page). Terms are as defined in `CONTEXT.md`.

The **3D Maqdala** recreation is a separate, later phase and is out of scope.

## Data

- **Wikidata is the only artifact source.** The Airtable and CSV loaders, the
  `ARTIFACT_SOURCE` switch, the dedup/matching UI, `/review`, and the
  "mark returned" API route are removed.
- **Returned** = the artifact's Wikidata item has a significant-event (P793)
  statement of *return* (Q65088609); its point in time (P585) is the return
  date. When there are several, the latest wins. 8 artifacts today.
- Returned artifacts pin at Addis Ababa (the existing `ADDIS_ABABA_COORDS`),
  which gives holderless returned artifacts one shared "Returned to Ethiopia"
  pin.
- Artifact ids are QIDs. Old `?wpId=<number>` links redirect to the matching
  artifact through its WordPress post URL (P973).
- Holders carry their country (P17) for the key numbers.
- The "looted property" / "looted art" P31 label never becomes a category.
- The details pane shows a placeholder plus an "add an image on Wikidata" link
  when the item has no P18.
- Tabots get no special handling: no images of them exist, so nothing needs
  filtering.

## `/` — front page (scrolling)

1. Hero collage: public-domain/free 1868 photographs from the Commons categories
   *Battle of Magdala* and *British Expedition to Abyssinia*, mixed with
   featured artifact images; title, tagline, "Explore the map" → `/map`.
2. Key numbers: Artifacts, Holders, Returned, Countries.
3. Featured artifacts: every artifact with a Wikidata image (P18, 6 today) plus
   every pinned artifact. Pins come first, in `content/pins.json` order, with
   their text; the rest follow by holder name, then label. A pinned artifact
   without an image shows the placeholder.
4. Recent repatriations: returned artifacts, newest return first, with the year.

## `/map` — story view (full screen)

- A sidebar switches between **Views** via `?view=`: `map` (Dispersal, the
  default) and `library`. The selected artifact is `?qid=` and survives
  switching Views.
- **Deferred:** the Gallery and Wikidata statements Views (agreed earlier, left
  out of this round on 2026-10-20). The Views model makes them easy to add.
- **Dispersal map**: MapLibre GL with OpenFreeMap tiles restyled to the app's
  brown/gold/parchment palette; picking a holder flies there with a pitched
  view. ADR 0001 (camera stays in the map effect) still holds.
- **Library**: the existing book/manuscript grid. `/library` and
  `/looted-library` redirect to `/map?view=library`.
- Mobile keeps the current drawers; the menu drawer lists the Views.

## Look

Dura-Europos's layout, this app's own palette (`app/globals.css` `@theme`) and
fonts (Playfair Display headings, Source Sans body), Tailwind only. Copy is
neutral and sourced.
