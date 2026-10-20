'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ADDIS_ABABA_COORDS, MAGDALA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';
import { displayCoords } from '@/lib/repatriation';

interface Props {
  artifacts: ArtifactCard[];
  selectedWpId: string | null;
  onSelect: (wpId: string) => void;
  /** Changes only when a holder is picked. A change means "fly to the holder
   *  once"; an unchanged token means the camera should frame the selection. */
  focusToken: number;
}

interface GroupedLocation {
  key: string;
  coords: [number, number];
  artifacts: ArtifactCard[];
}

// Mirror the `gold` and `location` tokens in app/globals.css (Leaflet path
// options take hex strings, not Tailwind classes).
const PIN_COLOR = '#daa520';
const ADDIS_PIN_COLOR = '#52b788';

function isAddisAbaba(coords: [number, number]): boolean {
  return coords[0] === ADDIS_ABABA_COORDS[0] && coords[1] === ADDIS_ABABA_COORDS[1];
}

function groupByCoords(artifacts: ArtifactCard[]): GroupedLocation[] {
  const groups = new Map<string, GroupedLocation>();

  for (const card of artifacts) {
    const coords = displayCoords(card);
    if (!coords) continue;
    const key = `${coords[0].toFixed(5)},${coords[1].toFixed(5)}`;
    if (!groups.has(key)) {
      groups.set(key, { key, coords, artifacts: [] });
    }
    groups.get(key)!.artifacts.push(card);
  }

  return Array.from(groups.values());
}

function ReviewMapController({
  artifacts,
  selectedWpId,
  focusToken,
}: {
  artifacts: ArtifactCard[];
  selectedWpId: string | null;
  focusToken: number;
}) {
  const map = useMap();
  const seenToken = useRef(focusToken);

  useEffect(() => {
    // A holder was just picked: fly to it once. Without this token the effect
    // could not tell a fresh pick from steady state, so every artifact click
    // flew back to the holder.
    if (focusToken !== seenToken.current) {
      seenToken.current = focusToken;
      const first = artifacts.find((a) => displayCoords(a));
      const coords = first ? displayCoords(first) : undefined;
      if (coords) {
        map.flyTo(coords, 7, { duration: 1 });
        return;
      }
    }

    if (!selectedWpId) {
      map.flyTo(MAGDALA_COORDS, 3, { duration: 0.8 });
      return;
    }

    const selected = artifacts.find((a) => a.wpId === selectedWpId);
    const coords = selected ? displayCoords(selected) : undefined;
    if (!coords) return;
    map.flyToBounds(L.latLngBounds([MAGDALA_COORDS, coords]), {
      padding: [70, 70],
      duration: 1,
    });
  }, [artifacts, map, selectedWpId, focusToken]);

  return null;
}

export default function ReviewMapLeaflet({ artifacts, selectedWpId, onSelect, focusToken }: Props) {
  const groups = useMemo(() => groupByCoords(artifacts), [artifacts]);
  const maxCount = Math.max(1, ...groups.map((g) => g.artifacts.length));
  const selected = artifacts.find((a) => a.wpId === selectedWpId) ?? null;
  const selectedCoords = selected ? displayCoords(selected) : undefined;

  return (
    <MapContainer
      center={MAGDALA_COORDS}
      zoom={3}
      style={{ height: '100%', width: '100%' }}
      zoomControl
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <ReviewMapController artifacts={artifacts} selectedWpId={selectedWpId} focusToken={focusToken} />

      <CircleMarker
        center={MAGDALA_COORDS}
        radius={12}
        pathOptions={{ color: '#e74c3c', weight: 2, fillColor: '#e74c3c', fillOpacity: 0.08 }}
      >
        <Tooltip direction="top" offset={[0, -14]}>
          <span className="font-heading text-xs">Magdala — origin</span>
        </Tooltip>
      </CircleMarker>

      {selectedCoords && (
        <Polyline
          positions={[MAGDALA_COORDS, selectedCoords]}
          pathOptions={{ color: '#e74c3c', weight: 2, opacity: 0.65, dashArray: '8 6' }}
        />
      )}

      {groups.map((group) => {
        const color = isAddisAbaba(group.coords) ? ADDIS_PIN_COLOR : PIN_COLOR;
        const radius = 7 + (group.artifacts.length / maxCount) * 15;
        const selectedInGroup = group.artifacts.some((a) => a.wpId === selectedWpId);

        return (
          <CircleMarker
            key={group.key}
            center={group.coords}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              weight: selectedInGroup ? 3 : 2,
              fillOpacity: selectedInGroup ? 0.75 : 0.45,
            }}
            eventHandlers={{
              click: () => onSelect(group.artifacts[0].wpId),
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
              <div className="text-xs min-w-48">
                <div className="font-semibold mb-1">{group.artifacts[0].holder?.name ?? 'Unknown holder'}</div>
                <div className="opacity-80">
                  {group.artifacts.length} artifact{group.artifacts.length === 1 ? '' : 's'}
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                  {group.artifacts.slice(0, 8).map((card) => (
                    <button
                      key={card.wpId}
                      type="button"
                      className="bg-transparent p-0 m-0 border-0 text-left w-full cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(card.wpId);
                      }}
                    >
                      • {card.title}
                    </button>
                  ))}
                  {group.artifacts.length > 8 && (
                    <div className="opacity-70">+{group.artifacts.length - 8} more</div>
                  )}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
