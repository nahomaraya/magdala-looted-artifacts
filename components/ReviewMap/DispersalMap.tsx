'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Popup, Source } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { MAGDALA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';
import { displayCoords, isReturned } from '@/lib/repatriation';
import { restyleBasemap } from './basemapStyle';
import { groupByCoords, groupsToGeoJSON, lngLatBounds, toLngLat } from './mapGeo';

interface Props {
  artifacts: ArtifactCard[];
  selectedWpId: string | null;
  onSelect: (wpId: string) => void;
  /** Changes only when a holder is picked. A change means "fly to the holder
   *  once"; an unchanged token means the camera should frame the selection. */
  focusToken: number;
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Mirror the `gold`, `location` and `looting` tokens in app/globals.css
// (MapLibre paint properties take colours, not Tailwind classes).
const PIN_COLOR = '#daa520';
const RETURNED_PIN_COLOR = '#52b788';
const ORIGIN_COLOR = '#e74c3c';

const PINS_LAYER = 'holder-pins';
const ORIGIN_LAYER = 'maqdala-origin';
const POPUP_TITLES = 8;
// Grace period for moving the pointer from a pin into its popup.
const POPUP_CLOSE_DELAY_MS = 200;

// Recolour MapLibre's popup chrome to the dark palette. maplibre-gl.css is
// unlayered, so it beats Tailwind's layered utilities: hence the `!`.
const POPUP_CLASS = [
  '[&_.maplibregl-popup-content]:bg-navy-light!',
  '[&_.maplibregl-popup-content]:text-parchment!',
  '[&_.maplibregl-popup-content]:border!',
  '[&_.maplibregl-popup-content]:border-navy-border!',
  '[&_.maplibregl-popup-content]:font-body!',
  // The popup anchors itself to fit the map; colour the tip for each side.
  '[&:is(.maplibregl-popup-anchor-bottom,.maplibregl-popup-anchor-bottom-left,.maplibregl-popup-anchor-bottom-right)_.maplibregl-popup-tip]:border-t-navy-light!',
  '[&:is(.maplibregl-popup-anchor-top,.maplibregl-popup-anchor-top-left,.maplibregl-popup-anchor-top-right)_.maplibregl-popup-tip]:border-b-navy-light!',
  '[&.maplibregl-popup-anchor-left_.maplibregl-popup-tip]:border-r-navy-light!',
  '[&.maplibregl-popup-anchor-right_.maplibregl-popup-tip]:border-l-navy-light!',
].join(' ');

const MAQDALA = toLngLat(MAGDALA_COORDS);

const ORIGIN_GEOJSON: GeoJSON.Feature<GeoJSON.Point> = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: MAQDALA },
  properties: {},
};

/** What the hover popup is showing: a holder group (by key) or the origin. */
type Hover = { kind: 'group'; key: string } | { kind: 'origin' };

export default function DispersalMap({ artifacts, selectedWpId, onSelect, focusToken }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const seenToken = useRef(focusToken);
  const [hover, setHover] = useState<Hover | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groups = useMemo(() => groupByCoords(artifacts), [artifacts]);
  const pins = useMemo(() => groupsToGeoJSON(groups, selectedWpId), [groups, selectedWpId]);
  const maxCount = Math.max(1, ...groups.map((g) => g.artifacts.length));
  const selected = artifacts.find((a) => a.wpId === selectedWpId) ?? null;
  const selectedCoords = selected ? displayCoords(selected) : undefined;

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;

    // A holder was just picked: fly to it once. Without this token the effect
    // could not tell a fresh pick from steady state, so every artifact click
    // flew back to the holder.
    if (focusToken !== seenToken.current) {
      seenToken.current = focusToken;
      const first = artifacts.find((a) => displayCoords(a));
      const coords = first ? displayCoords(first) : undefined;
      if (coords) {
        map.flyTo({ center: toLngLat(coords), zoom: 15, pitch: 55, bearing: -20, duration: 1500 });
        return;
      }
    }

    if (!selectedWpId) {
      map.flyTo({ center: MAQDALA, zoom: 1.6, pitch: 0, bearing: 0 });
      return;
    }

    const card = artifacts.find((a) => a.wpId === selectedWpId);
    const coords = card ? displayCoords(card) : undefined;
    if (!coords) return;
    map.fitBounds(lngLatBounds(MAGDALA_COORDS, coords), { padding: 70, pitch: 0, duration: 1000 });
  }, [artifacts, loaded, selectedWpId, focusToken]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const keepPopup = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closePopupSoon = () => {
    keepPopup();
    closeTimer.current = setTimeout(() => setHover(null), POPUP_CLOSE_DELAY_MS);
  };

  const onMouseMove = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    keepPopup();
    if (feature.layer.id === ORIGIN_LAYER) {
      setHover((h) => (h?.kind === 'origin' ? h : { kind: 'origin' }));
      return;
    }
    const key = feature.properties?.key as string;
    setHover((h) => (h?.kind === 'group' && h.key === key ? h : { kind: 'group', key }));
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.find((f) => f.layer.id === PINS_LAYER);
    const group = feature && groups.find((g) => g.key === feature.properties?.key);
    if (group) onSelect(group.artifacts[0].wpId);
  };

  const hoveredGroup = hover?.kind === 'group' ? groups.find((g) => g.key === hover.key) : undefined;
  const hoveredRadius = hoveredGroup ? 7 + (hoveredGroup.artifacts.length / maxCount) * 15 : 12;

  return (
    <Map
      ref={mapRef}
      mapStyle={MAP_STYLE}
      initialViewState={{ longitude: MAQDALA[0], latitude: MAQDALA[1], zoom: 1.6 }}
      style={{ height: '100%', width: '100%' }}
      attributionControl={{ compact: false }}
      interactiveLayerIds={[PINS_LAYER, ORIGIN_LAYER]}
      cursor={hover?.kind === 'group' ? 'pointer' : undefined}
      onLoad={(e) => {
        restyleBasemap(e.target);
        setLoaded(true);
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={closePopupSoon}
      onClick={onClick}
    >
      <Source id="maqdala-origin" type="geojson" data={ORIGIN_GEOJSON}>
        <Layer
          id={ORIGIN_LAYER}
          type="circle"
          paint={{
            'circle-radius': 12,
            'circle-color': ORIGIN_COLOR,
            'circle-opacity': 0.08,
            'circle-stroke-color': ORIGIN_COLOR,
            'circle-stroke-width': 2,
          }}
        />
      </Source>

      {selectedCoords && (
        <Source
          id="maqdala-line"
          type="geojson"
          data={{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [MAQDALA, toLngLat(selectedCoords)] },
            properties: {},
          }}
        >
          <Layer
            id="maqdala-line"
            type="line"
            paint={{
              'line-color': ORIGIN_COLOR,
              'line-width': 2,
              'line-opacity': 0.65,
              'line-dasharray': [4, 3],
            }}
          />
        </Source>
      )}

      <Source id="holder-pins" type="geojson" data={pins}>
        <Layer
          id={PINS_LAYER}
          type="circle"
          paint={{
            'circle-radius': ['+', 7, ['*', ['/', ['get', 'count'], maxCount], 15]],
            'circle-color': ['case', ['get', 'returned'], RETURNED_PIN_COLOR, PIN_COLOR],
            'circle-opacity': ['case', ['get', 'selected'], 0.75, 0.45],
            'circle-stroke-color': ['case', ['get', 'returned'], RETURNED_PIN_COLOR, PIN_COLOR],
            'circle-stroke-width': ['case', ['get', 'selected'], 3, 2],
          }}
        />
      </Source>

      {hover?.kind === 'origin' && (
        <Popup
          longitude={MAQDALA[0]}
          latitude={MAQDALA[1]}
          offset={14}
          closeButton={false}
          closeOnClick={false}
          focusAfterOpen={false}
          className={POPUP_CLASS}
        >
          <span className="font-heading text-xs">Maqdala — origin</span>
        </Popup>
      )}

      {hoveredGroup && (
        <Popup
          longitude={toLngLat(hoveredGroup.coords)[0]}
          latitude={toLngLat(hoveredGroup.coords)[1]}
          offset={hoveredRadius + 2}
          closeButton={false}
          closeOnClick={false}
          focusAfterOpen={false}
          maxWidth="280px"
          className={POPUP_CLASS}
        >
          <div className="text-xs min-w-48" onMouseEnter={keepPopup} onMouseLeave={closePopupSoon}>
            <div className="font-semibold mb-1">
              {hoveredGroup.artifacts.some(isReturned)
                ? 'Returned to Ethiopia'
                : hoveredGroup.artifacts[0].holder?.name ?? 'Unknown holder'}
            </div>
            <div className="opacity-80">
              {hoveredGroup.artifacts.length} artifact{hoveredGroup.artifacts.length === 1 ? '' : 's'}
            </div>
            <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
              {hoveredGroup.artifacts.slice(0, POPUP_TITLES).map((card) => (
                <button
                  key={card.wpId}
                  type="button"
                  className="bg-transparent p-0 m-0 border-0 text-left w-full cursor-pointer hover:underline"
                  onClick={() => onSelect(card.wpId)}
                >
                  • {card.title}
                </button>
              ))}
              {hoveredGroup.artifacts.length > POPUP_TITLES && (
                <div className="opacity-70">+{hoveredGroup.artifacts.length - POPUP_TITLES} more</div>
              )}
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}
