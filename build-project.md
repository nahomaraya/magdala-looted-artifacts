# Battle of Magdala — Looted Artifacts Interactive Map

## What To Build

A fullstack Next.js App Router application that traces the movement of artifacts looted during the 1868 Battle of Magdala (Maqdala), Ethiopia. The app fetches data from Wikidata in real-time and plots artifacts on an interactive map with animated flow lines from the origin (Magdala) to their current institutional locations worldwide.

Visual reference: the ERR (Einsatzstab Reichsleiter Rosenberg) looted art network map — a central hub with radiating lines to destination nodes, each annotated with images and labels.

## Tech Stack

- Next.js
- Leaflet via react-leaflet for mapping (dynamically imported with SSR disabled)
- Tailwind CSS for styling
- React Query (@tanstack/react-query) for client-side data fetching
- p-limit for server-side rate limiting of Wikidata API calls

## Data Sources

All data comes from Wikidata, accessed two ways:

1. **SPARQL endpoint** at `https://query.wikidata.org/sparql` — for discovering which items were looted at Magdala
2. **Wikidata REST API** at `https://www.wikidata.org/w/rest.php/wikibase/v1/` — for fetching detailed statements, labels, and entity data per item (authenticated via OAuth2 client credentials)
3. **Wikimedia Commons API** at `https://commons.wikimedia.org/w/api.php` — for resolving image filenames from Wikidata's P18 property into actual image URLs

## Core Data Model

Each artifact has:

- **Identity**: Wikidata QID, label, description
- **Image**: resolved from Wikidata P18 (image) → Commons filename → Commons API → actual URL
- **Current location**: resolved by following the chain: item's P276 (location) or P195 (collection) or P127 (owned by) → that entity's P625 (coordinate location). If no coordinates found, fall back to a hardcoded lookup table of known institution coordinates.
- **Provenance chain**: built from ALL P793 (significant event) statements on the item, each with qualifiers for date (P585), time period (P2348), location (P276), and participant (P710). These events include looting, acquisition, gift, sale, bequest — forming a timeline of the artifact's movement.
- **External identifiers**: extracted from all string-type statements. Key ones include P5199 (British Library system number), P1711 (British Museum object ID), P214 (VIAF). Each maps to a URL template for linking out to digital library viewers.

## Server-Side Architecture

All Wikidata communication must happen server-side in Next.js route handlers. The client never calls Wikidata directly. This avoids CORS issues and keeps OAuth credentials secure.

### SPARQL Query Strategy

The SPARQL queries must handle multiple data modeling patterns, because Wikidata editors are inconsistent in how they qualify looting events. Run three query patterns and merge/deduplicate results by QID:

**Pattern 1**: Items where P793 = looting (Q192623) and the qualifier P2348 (time period) = Battle of Magdala (Q947667).

**Pattern 2**: Items where P793 = looting (Q192623) and the qualifier P585 (point in time) falls in the year 1868.

**Pattern 3**: Items where P793 = any event, qualified with P2348 = Battle of Magdala (Q947667). This catches acquisition and other events, not just looting.

If all three patterns return zero results (Wikidata coverage of Magdala artifacts may be sparse), fall back to a curated list of known artifact QIDs and enrich them via the REST API. Log which patterns returned results.

### Wikidata REST API Usage

Authenticate via OAuth2 client credentials flow (register at Wikidata's OAuthConsumerRegistration page). Cache the access token in module scope until expiry.

For each item discovered via SPARQL, fetch its full statements via the REST API, then:

- Resolve location through the entity chain (item → location/collection/owner entity → coordinates)
- Extract the image filename from P18, then resolve it to a URL via the Commons API
- Extract all external identifiers from string-type statement values
- Build the full provenance chain by querying all P793 events for that item via a per-item SPARQL query

Rate-limit all REST API calls to max 5 concurrent using p-limit. Include a User-Agent header on all requests per Wikidata API etiquette.

### Provenance Chain Construction

For each artifact, the provenance is built from its P793 (significant event) statements. Each statement's qualifiers encode one step in the artifact's history:

- The statement value (ps:P793) identifies the event type. Map known event QIDs to human-readable labels: Q192623 = Looting, Q22340494 = Acquisition, Q707482 = Gift, Q194189 = Sale, Q211557 = Bequest.
- Qualifier P585 = when it happened
- Qualifier P2348 = which historical period (e.g., Battle of Magdala)
- Qualifier P276 = where it happened (resolve to coordinates for map)
- Qualifier P710 = who was involved (fetch their label and portrait image from P18)

Sort events chronologically. Always prepend "Origin — Magdala, Ethiopia" and append the current location as the final node.

### Coordinate Resolution

Many artifacts don't have direct coordinates. The resolution strategy is:

1. Check the item's P276 (location), P195 (collection), or P127 (owned by) for an entity reference
2. Fetch that entity's statements and look for P625 (coordinate location)
3. If no P625, look up the entity's label in a hardcoded table of known institution coordinates (British Museum, British Library, V&A, Bodleian, etc.)
4. If still nothing, default to London coordinates as last resort (most Magdala loot ended up there)

### API Route Handlers

- `GET /api/artifacts` — returns all artifacts with full provenance, location, images, identifiers
- `GET /api/artifacts/[qid]` — returns a single artifact's detailed data
- `GET /api/sparql` — returns raw SPARQL results for debugging

## Client-Side Architecture

### Layout

CSS Grid with two columns: a 370px sidebar on the left and the map filling the rest. A header spans the full width with the title, a live/fallback data badge, and artifact/location counts.

### Map Component

Must be dynamically imported with SSR disabled (Leaflet requires window). Uses react-leaflet with CartoDB dark_all tiles, desaturated via CSS filter.

**Origin marker**: Magdala at [11.2167, 39.3167] — a large pulsing red circle.

**Destination markers**: One per unique current location, sized proportionally to the number of artifacts there. Green circles.

**Flow lines**: Animated dashed polylines from Magdala to each destination. Red for looting routes, gold for acquisition/transfer routes. Use CSS stroke-dashoffset animation for the flowing effect.

**Interaction**: On clicking a destination marker, show a tooltip with institution name and artifact count. On selecting an artifact from the sidebar, zoom the map to show that artifact's route highlighted, and dim other routes.

### Sidebar

A scrollable list of artifact cards. Each card shows:

- Thumbnail image (if available)
- Artifact name (serif font)
- Short description (truncated)
- Current location as a green badge
- Event type tags — looting in red, acquisition in gold
- Click to select the artifact (highlights on map + opens detail panel)

Shows a loading spinner while fetching, error state with retry button if the API call fails.

### Detail Panel

A slide-in overlay on the right side of the map when an artifact is selected. Contains:

1. Artifact image (if available)
2. Description from Wikidata
3. Provenance timeline — a vertical dot-and-line component with color-coded steps (red for looting, gold for acquisition, green for current location). Each step shows event type, date, place, and participant with their portrait if available.
4. People involved — displayed as chips with small circular portrait images from Wikidata
5. External identifier links — for each identifier, a clickable link using the URL template (British Library, British Museum, VIAF, etc.)
6. Embedded iframes — for identifiers that resolve to digital library pages (British Library manuscript viewer, British Museum collection page), render both a link and a sandboxed lazy-loaded iframe so the user can preview the artifact in its current digital catalog
7. Wikidata link — direct link to the item's Wikidata page

Close button to dismiss. Closing also deselects the artifact on the map.

### State Management

Use React Query to fetch from /api/artifacts with a 30-minute stale time. Share the selected artifact state between the sidebar, map, and detail panel via React context or prop drilling through a parent layout component.

## Key Wikidata Properties

| Property | Name | Purpose |
|----------|------|---------|
| P793 | significant event | Looting, acquisition, gift events |
| P585 | point in time | Date qualifier on events |
| P2348 | time period | Links event to Battle of Magdala |
| P276 | location | Where an event happened or where item currently is |
| P625 | coordinate location | Latitude/longitude for mapping |
| P195 | collection | Which museum collection the item belongs to |
| P127 | owned by | Current owner institution or person |
| P710 | participant | Person involved in an event |
| P18 | image | Wikimedia Commons image filename |
| P17 | country | Country |
| P5199 | British Library system number | Links to BL digital manuscripts viewer |
| P1711 | British Museum object ID | Links to BM collection online |
| P214 | VIAF ID | Virtual International Authority File |
| P217 | inventory number | Museum catalog/inventory number |

## Known Artifacts for Fallback

If SPARQL returns zero results, seed the app with these known Magdala artifact QIDs and enrich them via the REST API:

- **Q1123371** — Kebra Nagast (Orient 818), currently at the British Library
- **Q116693582** — Kwer'ata Re'esu icon, currently in a private collection in Coimbra, Portugal

Other known artifacts that may or may not have Wikidata items yet:

- Gold Crown of the Abuna — Victoria & Albert Museum (V&A M.27-1868)
- Gold Chalice — Victoria & Albert Museum
- ~12 Ethiopian processional crosses — British Museum
- ~350 Ethiopian manuscripts — British Library Oriental collection
- ~11 Tabot altar tablets — British Museum
- Tewodros II's royal seal — returned to Ethiopia
- Various shields — some returned, some still in collections

## Known Institution Coordinates (Hardcoded Fallback)

Maintain a lookup table mapping institution names to coordinates for when the Wikidata entity chain doesn't yield P625:

- British Museum → 51.5194, -0.1270
- British Library → 51.5299, -0.1272
- Victoria and Albert Museum → 51.4966, -0.1722
- Bodleian Library → 51.7548, -1.2544
- Royal Library, Windsor Castle → 51.4839, -0.6044
- National Army Museum → 51.4891, -0.1612
- National Museum of Scotland → 55.9469, -3.1893
- Schøyen Collection → 59.9333, 10.7166
- Museum of Archaeology and Anthropology, Cambridge → 52.2014, 0.1195

## External Identifier URL Templates

Map property IDs to URL constructors for building links to digital library viewers:

- P5199 (British Library) → `https://www.bl.uk/manuscripts/FullDisplay.aspx?ref={value}`
- P1711 (British Museum) → `https://www.britishmuseum.org/collection/object/{value}`
- P214 (VIAF) → `https://viaf.org/viaf/{value}`

## Event Type Mapping

Map Wikidata event QIDs to display labels and color categories:

- Q192623 → "Looting" (red)
- Q22340494 → "Acquisition" (gold)
- Q707482 → "Gift" (gold)
- Q194189 → "Sale" (gold)
- Q211557 → "Bequest" (gold)
- Anything else → "Event" (neutral)

## Design Aesthetic

Dark scholarly/archival theme — like a museum exhibit or research tool, not a generic web app.

- Background: deep navy (#12121f)
- Accents: gold (#daa520)
- Text: parchment (#f4ead5)
- Headings font: Playfair Display (serif) via next/font/google
- Body font: Source Sans 3 (sans-serif) via next/font/google
- Event colors: looting = red (#e74c3c), acquisition = gold (#daa520), current location = green (#52b788)
- Map tiles desaturated and darkened via CSS filter
- No Inter, Roboto, purple gradients, or generic AI aesthetics

## Environment Variables

The app needs these in `.env.local`:

- `WIKIDATA_CLIENT_ID` — OAuth2 client ID from Wikidata
- `WIKIDATA_CLIENT_SECRET` — OAuth2 client secret from Wikidata

## Critical Implementation Notes

1. SPARQL will likely return very few results. The fallback-to-known-QIDs path is not an edge case — it's probably the primary path. Build it robustly.
2. Leaflet crashes during SSR. The map component must be dynamically imported with `{ ssr: false }`.
3. The React Query provider must be a client component wrapping the app in a providers file.
4. The Wikidata REST API's OAuth2 token endpoint is at the REST API base URL, not at a separate auth server.
5. P18 gives a filename, not a URL. You must resolve it through the Commons API to get an actual image URL.
6. Coordinate resolution almost always requires following an entity chain — direct P625 on the artifact itself is rare.
7. All server-side fetches to Wikidata and Commons must include a descriptive User-Agent header.
8. Use p-limit to cap concurrent Wikidata REST API calls at 5 to avoid rate limiting.