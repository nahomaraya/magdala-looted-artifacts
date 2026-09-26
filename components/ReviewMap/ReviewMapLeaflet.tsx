'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MAGDALA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';
import { displayCoords as artifactCoords } from './reviewMapUtils';
import { clampCameraInset } from './sheetGeometry';

type ReviewStatus = 'already' | 'fuzzy' | 'new';

interface Props {
  artifacts: ArtifactCard[];
  wikidataHits: Partial<Record<string, { label: string }>>;
  selectedWpId: string | null;
  onSelect: (wpId: string) => void;
  /** When set, the map flies to these coordinates instead of fitting bounds
   *  around Magdala + the selected artifact. Used by the holder rail. */
  focusCoords?: [number, number] | null;
  /** Compact (sheet) layout: no tooltips or zoom buttons; taps go to onMarkerTap. */
  compact?: boolean;
  onMarkerTap?: (artifacts: ArtifactCard[]) => void;
  /** Pixels at the bottom of the map covered by the mobile sheet. */
  bottomInset?: number;
}

interface GroupedLocation {
  key: string;
  coords: [number, number];
  artifacts: ArtifactCard[];
}

function getStatus(card: ArtifactCard): ReviewStatus {
  if (card.dedup.method === 'p973' && card.dedup.qid) return 'already';
  if (card.dedup.method === 'fuzzy' && card.dedup.qid) return 'fuzzy';
  return 'new';
}

function statusColor(status: ReviewStatus): string {
  if (status === 'already') return '#9ca3af';
  if (status === 'fuzzy') return '#f59e0b';
  return '#3b82f6';
}

function pickGroupStatus(cards: ArtifactCard[]): ReviewStatus {
  const counts: Record<ReviewStatus, number> = { already: 0, fuzzy: 0, new: 0 };
  for (const card of cards) counts[getStatus(card)] += 1;

  if (counts.already >= counts.fuzzy && counts.already >= counts.new) return 'already';
  if (counts.fuzzy >= counts.new) return 'fuzzy';
  return 'new';
}

function groupByCoords(artifacts: ArtifactCard[]): GroupedLocation[] {
  const groups = new Map<string, GroupedLocation>();

  for (const card of artifacts) {
    const coords = artifactCoords(card);
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
  focusCoords,
  bottomInset = 0,
}: {
  artifacts: ArtifactCard[];
  selectedWpId: string | null;
  focusCoords?: [number, number] | null;
  bottomInset?: number;
}) {
  const map = useMap();
  // Deps need a stable signature, otherwise a new array literal would re-fire
  // the effect on every parent render.
  const focusKey = focusCoords ? `${focusCoords[0]},${focusCoords[1]}` : '';

  // Read at fly time rather than depended on: dragging the sheet must not
  // re-fly the camera. Declared before the camera effect so a commit that
  // changes both the inset and the target flies with the new inset.
  const insetRef = useRef(bottomInset);
  useEffect(() => {
    insetRef.current = bottomInset;
  }, [bottomInset]);

  // The artifact pane can collapse without a window resize; Leaflet only
  // re-measures on window resize, so watch the container itself.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    const inset = clampCameraInset(insetRef.current, map.getSize().y);
    // Shift a fly-to centre down by half the hidden strip, so the target
    // lands in the middle of the visible map rather than behind the sheet.
    const visibleCenter = (coords: L.LatLngExpression, zoom: number) =>
      inset ? map.unproject(map.project(coords, zoom).add([0, inset / 2]), zoom) : coords;

    // Holder rail just narrowed the view — zoom in on the museum.
    if (focusCoords) {
      map.flyTo(visibleCenter(focusCoords, 7), 7, { duration: 1 });
      return;
    }

    if (!selectedWpId) {
      map.flyTo(visibleCenter(MAGDALA_COORDS, 3), 3, { duration: 0.8 });
      return;
    }

    const selected = artifacts.find((a) => a.wpId === selectedWpId);
    const coords = selected ? artifactCoords(selected) : undefined;
    if (!coords) return;
    const bounds = L.latLngBounds([MAGDALA_COORDS, coords]);
    map.flyToBounds(bounds, { paddingTopLeft: [70, 70], paddingBottomRight: [70, 70 + inset], duration: 1 });
  }, [artifacts, map, selectedWpId, focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function ReviewMapLeaflet({
  artifacts,
  wikidataHits,
  selectedWpId,
  onSelect,
  focusCoords,
  compact = false,
  onMarkerTap,
  bottomInset = 0,
}: Props) {
  const groups = useMemo(() => groupByCoords(artifacts), [artifacts]);
  const maxCount = Math.max(1, ...groups.map((g) => g.artifacts.length));
  const selected = artifacts.find((a) => a.wpId === selectedWpId) ?? null;
  const selectedCoords = selected ? artifactCoords(selected) : undefined;

  return (
    <MapContainer
      center={MAGDALA_COORDS}
      zoom={3}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {!compact && <ZoomControl position="topleft" />}

      <ReviewMapController
        artifacts={artifacts}
        selectedWpId={selectedWpId}
        focusCoords={focusCoords}
        bottomInset={bottomInset}
      />

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
        const status = pickGroupStatus(group.artifacts);
        const color = statusColor(status);
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
              click: () =>
                compact && onMarkerTap ? onMarkerTap(group.artifacts) : onSelect(group.artifacts[0].wpId),
            }}
          >
            {!compact && (
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
                        •{' '}
                        {card.dedup.method === 'p973' && card.dedup.qid
                          ? wikidataHits[card.dedup.qid]?.label ?? card.title
                          : card.title}
                      </button>
                    ))}
                    {group.artifacts.length > 8 && (
                      <div className="opacity-70">+{group.artifacts.length - 8} more</div>
                    )}
                  </div>
                </div>
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
