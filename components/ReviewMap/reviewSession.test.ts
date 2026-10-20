import { describe, expect, it } from 'vitest';
import type { ArtifactCard, ResolvedHolder } from '@/lib/types';
import { derive, initSession, reduce, UNKNOWN_HOLDER } from './reviewSession';

function card(over: Partial<ArtifactCard> & { wpId: string }): ArtifactCard {
  return {
    slug: '', url: `https://example.com/${over.wpId}`, title: `Artifact ${over.wpId}`,
    weakLink: false, imageUrls: [], sourceLinks: ['https://example.com/src'],
    holder: null, allHolders: [], primaryCategory: null, allCategories: [],
    maqdalaConfidence: null, isReviewable: true,
    dedup: { exists: true, qid: 'Q1', method: 'p973', confidence: 100 },
    ...over,
  } as ArtifactCard;
}

// ResolvedHolder.coords is REQUIRED (lib/types.ts:92), so it needs a default.
// 'wikidata' is a valid QidSource (lib/types.ts:64) — the read path uses it.
const holder = (
  name: string,
  qid: string | null = null,
  coords: [number, number] = [51.5194, -0.127],
): ResolvedHolder => ({ name, qid, rawName: name, coords, source: 'wikidata' });

const A = card({ wpId: 'a', holder: holder('British Museum', 'Q6373') });
const B = card({ wpId: 'b', holder: holder('British Museum', 'Q6373') });
const C = card({ wpId: 'c', holder: holder('British Library', 'Q23308') });
const WEAK = card({ wpId: 'w', weakLink: true, holder: holder('British Museum', 'Q6373') });
const NO_SRC = card({ wpId: 'n', sourceLinks: [], holder: holder('British Library', 'Q23308') });
const RETURNED = card({ wpId: 'r', returned: true, holder: holder('National Museum of Ethiopia') });

const ALL = [A, B, C, WEAK, NO_SRC, RETURNED];

describe('visibility (rule 1)', () => {
  it('hides weak links and source-less artifacts by default', () => {
    const v = derive(initSession(ALL, null), ALL, null);
    expect(v.visible.map((a) => a.wpId)).toEqual(['a', 'b', 'c', 'r']);
  });

  it('shows everything when weak links are on', () => {
    const s = reduce(initSession(ALL, null), { t: 'toggleWeakLink' }, ALL, null);
    expect(derive(s, ALL, null).visible).toHaveLength(6);
  });

  it('returned-only wins over weak-link and ignores source links', () => {
    let s = reduce(initSession(ALL, null), { t: 'toggleWeakLink' }, ALL, null);
    s = reduce(s, { t: 'toggleReturnedOnly' }, ALL, null);
    expect(derive(s, ALL, null).visible.map((a) => a.wpId)).toEqual(['r']);
  });

  it('counts returned artifacts independently of the filters', () => {
    expect(derive(initSession(ALL, null), ALL, null).returnedCount).toBe(1);
  });
});

describe('the deep-link pin (rule 2)', () => {
  it('shows a pinned weak link that the filters would hide', () => {
    const v = derive(initSession(ALL, 'w'), ALL, 'w');
    expect(v.visible.map((a) => a.wpId)).toContain('w');
    expect(v.selected?.wpId).toBe('w');
  });

  it('survives a filter change', () => {
    const s = reduce(initSession(ALL, 'w'), { t: 'toggleWeakLink' }, ALL, 'w');
    expect(derive(s, ALL, 'w').visible.map((a) => a.wpId)).toContain('w');
  });

  it('dies once the user picks another artifact', () => {
    const s = reduce(initSession(ALL, 'w'), { t: 'selectArtifact', wpId: 'a' }, ALL, 'w');
    expect(derive(s, ALL, 'w').visible.map((a) => a.wpId)).not.toContain('w');
  });

  it('survives the user landing on the pinned artifact via prev', () => {
    // Filtering to the British Museum gives [a, b, w] with selection reset to
    // 'a'; stepping back from 'a' wraps to 'w', the pinned artifact. Landing on
    // the pin is not "navigating away", so the pin must stay alive.
    let s = reduce(initSession(ALL, 'w'), { t: 'selectHolder', name: 'British Museum' }, ALL, 'w');
    s = reduce(s, { t: 'prev' }, ALL, 'w');
    const v = derive(s, ALL, 'w');
    expect(s.selectedWpId).toBe('w');
    expect(v.selected?.wpId).toBe('w');
    expect(v.visible.map((a) => a.wpId)).toContain('w');
  });

  it('survives an explicit pick of the pinned artifact itself', () => {
    // Two weak-link toggles reset the selection to 'a' without changing the
    // filters; explicitly picking 'w' again must not count as navigating away.
    let s = reduce(initSession(ALL, 'w'), { t: 'toggleWeakLink' }, ALL, 'w');
    s = reduce(s, { t: 'toggleWeakLink' }, ALL, 'w');
    s = reduce(s, { t: 'selectArtifact', wpId: 'w' }, ALL, 'w');
    const v = derive(s, ALL, 'w');
    expect(v.selected?.wpId).toBe('w');
    expect(v.visible.map((a) => a.wpId)).toContain('w');
  });
});

describe('holder groups and filtering (rules 3, 4)', () => {
  it('groups by holder name and sorts by count descending', () => {
    const v = derive(initSession(ALL, null), ALL, null);
    expect(v.holderGroups.map((g) => [g.name, g.count])).toEqual([
      ['British Museum', 2], ['British Library', 1], ['National Museum of Ethiopia', 1],
    ]);
  });

  it('files a holder-less artifact under UNKNOWN_HOLDER', () => {
    const orphan = card({ wpId: 'o' });
    const v = derive(initSession([orphan], null), [orphan], null);
    expect(v.holderGroups[0].name).toBe(UNKNOWN_HOLDER);
  });

  it('narrows to the selected holder', () => {
    const s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    expect(derive(s, ALL, null).filtered.map((a) => a.wpId)).toEqual(['a', 'b']);
  });
});

describe('selection reset (rule 5)', () => {
  it('selects the first artifact of the newly picked holder', () => {
    const s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Library' }, ALL, null);
    expect(derive(s, ALL, null).selected?.wpId).toBe('c');
  });

  it('never leaves a selection outside the filtered list', () => {
    let s = reduce(initSession(ALL, null), { t: 'selectArtifact', wpId: 'c' }, ALL, null);
    s = reduce(s, { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    const v = derive(s, ALL, null);
    expect(v.selectedIndex).toBeGreaterThanOrEqual(0);
    expect(v.filtered.map((a) => a.wpId)).toContain(v.selected?.wpId);
  });
});

describe('navigation (rule 6)', () => {
  it('wraps forward past the end', () => {
    let s = reduce(initSession(ALL, null), { t: 'selectArtifact', wpId: 'r' }, ALL, null);
    s = reduce(s, { t: 'next' }, ALL, null);
    expect(derive(s, ALL, null).selected?.wpId).toBe('a');
  });

  it('wraps backward past the start', () => {
    let s = reduce(initSession(ALL, null), { t: 'selectArtifact', wpId: 'a' }, ALL, null);
    s = reduce(s, { t: 'prev' }, ALL, null);
    expect(derive(s, ALL, null).selected?.wpId).toBe('r');
  });

  it('is a no-op on an empty list', () => {
    const s = initSession([], null);
    expect(reduce(s, { t: 'next' }, [], null)).toEqual(s);
  });
});

describe('the focus token (rule 7)', () => {
  it('bumps when a holder is picked', () => {
    const s0 = initSession(ALL, null);
    const s1 = reduce(s0, { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    expect(s1.focusToken).toBe(s0.focusToken + 1);
  });

  it('does NOT bump when the holder is cleared', () => {
    // Clearing the filter is not a pick, so the map must not fly anywhere.
    let s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    expect(s.focusToken).toBe(1);
    s = reduce(s, { t: 'selectHolder', name: null }, ALL, null);
    expect(s.focusToken).toBe(1);
    expect(s.holder).toBeNull();
  });

  it('does NOT bump when an artifact is picked', () => {
    // This is bug 1: an artifact click must not re-trigger the holder fly-to.
    let s = reduce(initSession(ALL, null), { t: 'selectHolder', name: 'British Museum' }, ALL, null);
    const afterHolder = s.focusToken;
    s = reduce(s, { t: 'selectArtifact', wpId: 'b' }, ALL, null);
    expect(s.focusToken).toBe(afterHolder);
  });

  it('does NOT bump on navigation or toggles', () => {
    let s = reduce(initSession(ALL, null), { t: 'next' }, ALL, null);
    expect(s.focusToken).toBe(0);
    s = reduce(s, { t: 'toggleWeakLink' }, ALL, null);
    expect(s.focusToken).toBe(0);
  });
});

describe('empty holders (rule 8)', () => {
  it('clears a holder that no longer has visible artifacts', () => {
    const weakOnly = [card({ wpId: 'x', weakLink: true, holder: holder('Tiny Museum') }), A];
    let s = reduce(initSession(weakOnly, null), { t: 'toggleWeakLink' }, weakOnly, null);
    s = reduce(s, { t: 'selectHolder', name: 'Tiny Museum' }, weakOnly, null);
    expect(s.holder).toBe('Tiny Museum');
    s = reduce(s, { t: 'toggleWeakLink' }, weakOnly, null);   // hide weak links again
    expect(s.holder).toBeNull();
  });
});
