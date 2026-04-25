'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { MAGDALA_COORDS } from '@/lib/constants';
import type { Artifact } from '@/lib/types';

interface Props {
  artifacts: Artifact[];
  selectedQID: string | null;
  onSelectArtifact: (qid: string | null) => void;
}

// Group artifacts by destination (by location name)
function groupByLocation(artifacts: Artifact[]) {
  const map = new Map<
    string,
    { name: string; coords: [number, number]; artifacts: Artifact[] }
  >();
  for (const a of artifacts) {
    const key = a.currentLocation.name;
    if (!map.has(key)) {
      map.set(key, { name: key, coords: a.currentLocation.coords, artifacts: [] });
    }
    map.get(key)!.artifacts.push(a);
  }
  return Array.from(map.values());
}

// Determine flow line color from artifact provenance
function flowColor(artifact: Artifact): string {
  const hasLooting = artifact.provenance.some((e) => e.color === 'red');
  return hasLooting ? '#e74c3c' : '#daa520';
}

function flowClass(artifact: Artifact): string {
  const hasLooting = artifact.provenance.some((e) => e.color === 'red');
  return hasLooting ? 'flow-line-red' : 'flow-line-gold';
}

// Pulsing DivIcon for Magdala
function createPulsingIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="pulse-container">
      <div class="pulse-ring"></div>
      <div class="pulse-ring pulse-ring-2"></div>
      <div class="pulse-dot"></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Sub-component to fly to selected artifact
function MapController({
  artifacts,
  selectedQID,
}: {
  artifacts: Artifact[];
  selectedQID: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedQID) {
      map.flyTo(MAGDALA_COORDS, 3, { duration: 1 });
      return;
    }
    const artifact = artifacts.find((a) => a.qid === selectedQID);
    if (!artifact) return;
    const bounds = L.latLngBounds([MAGDALA_COORDS, artifact.currentLocation.coords]);
    map.flyToBounds(bounds, { padding: [80, 80], duration: 1.2 });
  }, [selectedQID, artifacts, map]);

  return null;
}

export default function MapView({ artifacts, selectedQID, onSelectArtifact }: Props) {
  const locationGroups = useMemo(() => groupByLocation(artifacts), [artifacts]);
  const pulsingIcon = useMemo(() => createPulsingIcon(), []);

  // Max artifacts at any single location (for sizing)
  const maxCount = Math.max(1, ...locationGroups.map((g) => g.artifacts.length));

  return (
    <MapContainer
      center={MAGDALA_COORDS}
      zoom={3}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <MapController artifacts={artifacts} selectedQID={selectedQID} />

      {/* Flow lines */}
      {artifacts.map((artifact) => {
        const isSelected = selectedQID === artifact.qid;
        const isOtherSelected = selectedQID !== null && !isSelected;
        const color = flowColor(artifact);
        const cls = flowClass(artifact);

        return (
          <Polyline
            key={`line-${artifact.qid}`}
            positions={[MAGDALA_COORDS, artifact.currentLocation.coords]}
            pathOptions={{
              color,
              weight: isSelected ? 3 : 1.5,
              opacity: isOtherSelected ? 0.15 : isSelected ? 1 : 0.6,
              dashArray: '10 6',
              className: cls,
            }}
            eventHandlers={{
              click: () => onSelectArtifact(artifact.qid),
            }}
          />
        );
      })}

      {/* Magdala origin marker */}
      <Tooltip
        permanent={false}
        direction="top"
        offset={[0, -10]}
        opacity={1}
      >
        <span style={{ fontFamily: 'var(--font-playfair)', fontSize: 13 }}>
          Magdala — Origin
        </span>
      </Tooltip>
      {/* Use a CircleMarker fallback for the origin label */}
      <CircleMarker
        center={MAGDALA_COORDS}
        radius={18}
        pathOptions={{ color: '#e74c3c', weight: 2, fillColor: '#e74c3c', fillOpacity: 0.08 }}
      >
        <Tooltip direction="top" offset={[0, -18]} permanent={false}>
          <div style={{ fontFamily: 'var(--font-playfair), Georgia, serif', textAlign: 'center' }}>
            <strong style={{ color: '#e74c3c' }}>Magdala</strong>
            <br />
            <span style={{ fontSize: 11, color: '#c8b89a', fontStyle: 'italic' }}>Origin — Ethiopia, 1868</span>
          </div>
        </Tooltip>
      </CircleMarker>

      {/* Destination markers */}
      {locationGroups.map((group) => {
        const count = group.artifacts.length;
        const radius = 6 + (count / maxCount) * 14;
        const groupHasSelected = group.artifacts.some((a) => a.qid === selectedQID);

        return (
          <CircleMarker
            key={group.name}
            center={group.coords}
            radius={radius}
            pathOptions={{
              color: '#52b788',
              weight: 2,
              fillColor: '#52b788',
              fillOpacity: selectedQID
                ? group.artifacts.some((a) => a.qid === selectedQID)
                  ? 0.5
                  : 0.1
                : 0.3,
            }}
            eventHandlers={{
              click: () => {
                if (group.artifacts.length === 1) {
                  onSelectArtifact(group.artifacts[0].qid);
                }
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
              <div style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                <strong style={{ color: '#52b788' }}>{group.name}</strong>
                <br />
                <span style={{ fontSize: 11, color: '#c8b89a', fontStyle: 'italic' }}>
                  {count} artifact{count !== 1 ? 's' : ''}
                </span>
                {group.artifacts.map((a) => (
                  <div
                    key={a.qid}
                    style={{ fontSize: 11, color: '#f4ead5', marginTop: 2, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectArtifact(a.qid);
                    }}
                  >
                    · {a.label}
                  </div>
                ))}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
