import { describe, expect, it } from 'vitest';
import { ADDIS_ABABA_COORDS } from '@/lib/constants';
import { displayCoords, isReturned } from '@/lib/repatriation';
import type { ArtifactCard, ResolvedHolder } from '@/lib/types';

// ArtifactCard still carries fields removed in a later task, hence the cast.
function card(over: Partial<ArtifactCard> = {}): ArtifactCard {
  return {
    wpId: 'Q1', slug: '', url: 'https://example.com/Q1', title: 'Artifact',
    weakLink: false, imageUrls: [], sourceLinks: [],
    holder: null, allHolders: [], primaryCategory: null, allCategories: [],
    returned: false,
    ...over,
  } as unknown as ArtifactCard;
}

const holder = (name: string, coords: [number, number]): ResolvedHolder => ({
  name, qid: null, rawName: name, coords, source: 'wikidata',
});

describe('isReturned', () => {
  it('is not returned just because the holder is the National Museum of Ethiopia', () => {
    const ethiopian = holder('National Museum of Ethiopia', ADDIS_ABABA_COORDS);
    const c = card({ returned: false, holder: ethiopian, allHolders: [ethiopian] });
    expect(isReturned(c)).toBe(false);
  });

  it('is not returned from a "Returned plunder" category alone', () => {
    const category = { name: 'Returned plunder', rawName: 'Returned plunder' };
    const c = card({ returned: false, allCategories: [category] } as unknown as Partial<ArtifactCard>);
    expect(isReturned(c)).toBe(false);
  });

  it('is returned when a return event is recorded', () => {
    expect(isReturned(card({ returned: true }))).toBe(true);
  });
});

describe('displayCoords', () => {
  it('pins a returned artifact with no holder at Addis Ababa', () => {
    expect(displayCoords(card({ returned: true, holder: null }))).toEqual(ADDIS_ABABA_COORDS);
  });

  it('pins a non-returned artifact at its holder', () => {
    const london: [number, number] = [51.5194, -0.127];
    const c = card({ returned: false, holder: holder('British Museum', london) });
    expect(displayCoords(c)).toEqual(london);
  });
});
