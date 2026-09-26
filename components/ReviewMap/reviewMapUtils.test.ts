import { describe, expect, it } from 'vitest';
import { ADDIS_ABABA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';
import { displayCoords, holderFocusCoords } from './reviewMapUtils';

const LONDON: [number, number] = [51.5, -0.12];

// Only the fields the repatriation check and pin placement read.
function card(overrides: Partial<ArtifactCard>): ArtifactCard {
  return {
    wpId: 'x',
    returned: false,
    allCategories: [],
    allHolders: [],
    where: null,
    holder: { name: 'National Army Museum', rawName: 'National Army Museum', qid: null, coords: LONDON },
    ...overrides,
  } as unknown as ArtifactCard;
}

describe('displayCoords', () => {
  it('pins an artifact at its holder', () => {
    expect(displayCoords(card({}))).toEqual(LONDON);
  });

  it('pins a returned artifact at Addis Ababa whoever holds it', () => {
    expect(displayCoords(card({ returned: true }))).toEqual(ADDIS_ABABA_COORDS);
  });
});

describe('holderFocusCoords', () => {
  it('flies to where the holder\'s pins are drawn, not the holder\'s own coordinates', () => {
    expect(holderFocusCoords([card({ returned: true })])).toEqual(ADDIS_ABABA_COORDS);
  });

  it('skips artifacts that have no pin', () => {
    expect(holderFocusCoords([card({ holder: null }), card({})])).toEqual(LONDON);
  });

  it('is null when nothing in focus has a pin', () => {
    expect(holderFocusCoords([card({ holder: null })])).toBeNull();
  });
});
