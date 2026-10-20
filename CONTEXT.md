# Looted Artifacts

Objects taken from Maqdala in 1868, where they are held today, and what is
known about how they got there. Wikidata is the source of truth; this project
reads from it and presents it as a map and a library.

## Language

**Artifact**:
An object taken during the looting of Maqdala, tracked as a single record with
its own Wikidata item.
_Avoid_: object, item, piece, treasure

**Holder**:
Whoever holds an artifact today — a museum, library, church, or private
collection. An artifact may have more than one, and the holder may be unknown.
_Avoid_: museum, institution, owner, location

**Maqdala**:
The 1868 Battle of Magdala and the looting that followed. The event that scopes
every artifact in this project.
_Avoid_: Magdala (except within the battle's proper name), Abyssinian campaign

**Returned**:
The state of an artifact whose repatriation is on record. A returned artifact
may have no known holder; it is still back in Ethiopia.
_Avoid_: restituted, given back, recovered

**Repatriation**:
The act of returning an artifact to Ethiopia. Distinct from **Returned**, which
is the resulting state of the artifact.
_Avoid_: restitution, handover

**Tabot**:
A consecrated altar tablet of the Ethiopian Orthodox Church, sacred and seen
only by priests. Tabots taken at Maqdala are artifacts like any other.
_Avoid_: altar slab, tablet, ark

**Weak link**:
An artifact whose connection to Maqdala is weaker than the rest — recorded, but
not firmly attributed to the looting.
_Avoid_: uncertain, disputed, unconfirmed, low confidence

**Primary source**:
The published account an artifact's record was drawn from. Doubles as the join
key between this project's records and Wikidata.
_Avoid_: reference, citation, article, link

**Dispersal**:
The spread of artifacts from Maqdala to their holders around the world — what
the map shows.
_Avoid_: distribution, scattering, provenance map

**Featured artifact**:
An artifact given prominent display: every artifact with an image on its
Wikidata item, plus any pinned artifact.
_Avoid_: highlight, spotlight, hero artifact

**Pinned artifact**:
An artifact a curator has hand-placed at the front of the featured display,
with written text of its own. Pinning makes an artifact featured even when its
Wikidata item has no image.
_Avoid_: starred, curated, top pick

**View**:
One of the panels a reader moves between on the map page, such as the
dispersal map or the library.
_Avoid_: section, moment, chapter, tab

**Review session**:
One reader's pass over the map: which artifacts are in scope, which holder is in
focus, and which artifact is selected. A session may have no artifact selected
until the reader picks one.
_Avoid_: map state, filter state, view state
