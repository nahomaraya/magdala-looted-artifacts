import type { ArtifactCard } from '@/lib/types';
import { displayCoords, isReturned } from '@/lib/repatriation';

export interface GroupedLocation {
  key: string;
  /** `[lat, lng]`, as the rest of the app stores coordinates. */
  coords: [number, number];
  artifacts: ArtifactCard[];
}

export interface GroupProperties {
  key: string;
  count: number;
  holder: string;
  selected: boolean;
  returned: boolean;
}

/** The app stores `[lat, lng]`; MapLibre and GeoJSON take `[lng, lat]`. */
export function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

/**
 * The box around two `[lat, lng]` points as `[south-west, north-east]` in
 * `[lng, lat]`. MapLibre's `fitBounds` reads a pair that way, so an unsorted
 * pair (Maqdala, then London to its west) would wrap across the antimeridian.
 */
export function lngLatBounds(
  a: [number, number],
  b: [number, number],
): [[number, number], [number, number]] {
  return [
    [Math.min(a[1], b[1]), Math.min(a[0], b[0])],
    [Math.max(a[1], b[1]), Math.max(a[0], b[0])],
  ];
}

/** One pin per distinct display coordinate, holding every artifact plotted there. */
export function groupByCoords(artifacts: ArtifactCard[]): GroupedLocation[] {
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

/**
 * The holder pins as a GeoJSON source. A group is `returned` when any of its
 * artifacts is: returned artifacts all plot at Addis Ababa, so this marks that
 * group.
 */
export function groupsToGeoJSON(
  groups: GroupedLocation[],
  selectedQid: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Point, GroupProperties> {
  return {
    type: 'FeatureCollection',
    features: groups.map((group) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: toLngLat(group.coords) },
      properties: {
        key: group.key,
        count: group.artifacts.length,
        holder: group.artifacts[0].holder?.name ?? 'Unknown holder',
        selected: group.artifacts.some((a) => a.wpId === selectedQid),
        returned: group.artifacts.some(isReturned),
      },
    })),
  };
}
