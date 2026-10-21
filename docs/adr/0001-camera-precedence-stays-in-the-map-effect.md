# Camera precedence stays in the map effect

When we deepened the review session into a pure module (`reviewSession.ts`), we
deliberately did **not** move the map camera into it. The session emits only a
`focusToken` that changes when a holder is picked; `ReviewMapLeaflet` still
decides, inside its `useEffect`, whether to fly to the holder or frame the
selected artifact. The alternative was a pure `cameraTarget` value in the
session view, which would have made "where should the camera be?" assertable
without mounting a map.

We chose the smaller blast radius. The camera is the part of this screen you
verify by looking at it, and pulling `flyTo`/`flyToBounds` sequencing into pure
state would have meant modelling Leaflet's animation lifecycle in the session.

## Consequences

Camera precedence is **not** covered by the `reviewSession` tests. The two bugs
this refactor fixed — the holder fly-to re-firing on every artifact click, and
the camera ignoring the repatriation coordinate override — are held down by the
`focusToken` contract and by `displayCoords` being shared with the pins, not by
assertions. If that effect is edited, re-check both by hand.

A future architecture review will likely flag "the camera is resolved in a
browser-only module" as a deepening opportunity. That is this decision, not an
oversight. Revisit it only if camera bugs recur.

**Update 2026-10:** the map moved from Leaflet to MapLibre (`DispersalMap`). The
rule applies unchanged to `DispersalMap`: its `useEffect` keeps the same
precedence (fresh `focusToken` → fly to the holder once; no selection → world
view on Maqdala; selection → frame Maqdala and the selected artifact).
