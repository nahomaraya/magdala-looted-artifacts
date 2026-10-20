import { describe, expect, it } from 'vitest';
import { mapHref, parseQid, parseView, VIEW_LABELS, VIEWS } from './views';

describe('VIEWS and VIEW_LABELS', () => {
  it('lists the two views with their labels', () => {
    expect(VIEWS).toEqual(['map', 'library']);
    expect(VIEW_LABELS).toEqual({ map: 'Dispersal', library: 'Library' });
  });
});

describe('parseView', () => {
  it('returns the view id for known values', () => {
    expect(parseView('map')).toBe('map');
    expect(parseView('library')).toBe('library');
  });

  it('falls back to map for unknown, empty or missing values', () => {
    expect(parseView('gallery')).toBe('map');
    expect(parseView('')).toBe('map');
    expect(parseView(undefined)).toBe('map');
    expect(parseView(null)).toBe('map');
  });

  it('is case-sensitive', () => {
    expect(parseView('Library')).toBe('map');
  });
});

describe('mapHref', () => {
  it('omits view and qid for the default view with no selection', () => {
    expect(mapHref('map', null)).toBe('/map');
  });

  it('adds view=library when the library view is active', () => {
    expect(mapHref('library', null)).toBe('/map?view=library');
  });

  it('adds qid when an artifact is selected in the map view', () => {
    expect(mapHref('map', 'Q1')).toBe('/map?qid=Q1');
  });

  it('adds both view and qid when both apply', () => {
    expect(mapHref('library', 'Q1')).toBe('/map?view=library&qid=Q1');
  });
});

describe('parseQid', () => {
  it('returns valid QIDs unchanged', () => {
    expect(parseQid('Q1')).toBe('Q1');
    expect(parseQid('Q65088609')).toBe('Q65088609');
  });

  it('returns null for values that are not QIDs', () => {
    expect(parseQid('123')).toBeNull();
    expect(parseQid('q1')).toBeNull();
    expect(parseQid('Q')).toBeNull();
    expect(parseQid('Q1 ')).toBeNull();
    expect(parseQid('')).toBeNull();
    expect(parseQid(undefined)).toBeNull();
    expect(parseQid(null)).toBeNull();
  });
});
