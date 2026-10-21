import { describe, expect, it } from 'vitest';
import { ADDIS_ABABA_COORDS } from '@/lib/constants';
import type { ArtifactCard, ResolvedHolder } from '@/lib/types';
import { groupByCoords, groupsToGeoJSON, lngLatBounds, toLngLat } from './mapGeo';

function card(over: Partial<ArtifactCard> = {}): ArtifactCard {
  return {
    wpId: 'Q1', slug: '', url: 'https://example.com/Q1', title: 'Artifact',
    weakLink: false, imageUrls: [], sourceLinks: [],
    holder: null, allHolders: [], primaryCategory: null, allCategories: [],
    returned: false,
    ...over,
  };
}

const holder = (name: string, coords: [number, number]): ResolvedHolder => ({
  name, qid: null, rawName: name, coords, source: 'wikidata',
});

const LONDON: [number, number] = [51.5194, -0.127];
const EDINBURGH: [number, number] = [55.9469, -3.1903];

describe('toLngLat', () => {
  it('swaps [lat, lng] into the [lng, lat] order MapLibre expects', () => {
    expect(toLngLat([11.2167, 39.3167])).toEqual([39.3167, 11.2167]);
  });
});

describe('lngLatBounds', () => {
  // fitBounds reads a pair as [south-west, north-east]; passing Maqdala then
  // London unsorted makes west > east and the box wraps the antimeridian.
  it('orders two [lat, lng] points into [sw, ne] in [lng, lat]', () => {
    expect(lngLatBounds([11.2167, 39.3167], LONDON)).toEqual([
      [LONDON[1], 11.2167],
      [39.3167, LONDON[0]],
    ]);
  });
});

describe('groupsToGeoJSON', () => {
  const artifacts = [
    card({ wpId: 'Q1', holder: holder('British Museum', LONDON) }),
    card({ wpId: 'Q2', holder: holder('British Museum', LONDON) }),
    card({ wpId: 'Q3', holder: holder('National Museum of Scotland', EDINBURGH) }),
    card({ wpId: 'Q4', holder: holder('British Museum', LONDON), returned: true }),
  ];
  const groups = groupByCoords(artifacts);

  it('emits one point per group in [lng, lat] order with its count', () => {
    const fc = groupsToGeoJSON(groups, null);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(3);
    const london = fc.features.find((f) => f.properties!.holder === 'British Museum' && !f.properties!.returned)!;
    expect(london.geometry.coordinates).toEqual([LONDON[1], LONDON[0]]);
    expect(london.properties!.count).toBe(2);
  });

  it('marks only the group holding the selected QID as selected', () => {
    const fc = groupsToGeoJSON(groups, 'Q3');
    const selected = fc.features.filter((f) => f.properties!.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].properties!.holder).toBe('National Museum of Scotland');
    expect(groupsToGeoJSON(groups, null).features.some((f) => f.properties!.selected)).toBe(false);
  });

  it('marks the Addis Ababa group of returned artifacts as returned', () => {
    const fc = groupsToGeoJSON(groups, null);
    const returned = fc.features.filter((f) => f.properties!.returned);
    expect(returned).toHaveLength(1);
    expect(returned[0].geometry.coordinates).toEqual([ADDIS_ABABA_COORDS[1], ADDIS_ABABA_COORDS[0]]);
    expect(returned[0].properties!.count).toBe(1);
  });
});
