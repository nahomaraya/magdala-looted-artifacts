import { describe, expect, it } from 'vitest';
import { keyNumbers, recentRepatriations } from '@/lib/frontPageStats';
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

const holder = (name: string, qid: string | null, country?: string): ResolvedHolder => ({
  name, qid, rawName: name, coords: [0, 0], source: 'wikidata', country,
});

describe('keyNumbers', () => {
  it('counts artifacts and returned artifacts', () => {
    const cards = [card({ returned: true }), card(), card()];
    expect(keyNumbers(cards)).toMatchObject({ artifacts: 3, returned: 1 });
  });

  it('counts a holder shared by two cards once', () => {
    const bm = holder('British Museum', 'Q6373', 'United Kingdom');
    const cards = [card({ allHolders: [bm] }), card({ allHolders: [bm] })];
    expect(keyNumbers(cards).holders).toBe(1);
  });

  it('does not count a holder without a QID', () => {
    const cards = [card({ allHolders: [holder('Private collection', null)] })];
    expect(keyNumbers(cards).holders).toBe(0);
  });

  it('counts two holders in one country as one country', () => {
    const cards = [
      card({ allHolders: [holder('British Museum', 'Q6373', 'United Kingdom')] }),
      card({ allHolders: [holder('V&A', 'Q213322', 'United Kingdom')] }),
    ];
    expect(keyNumbers(cards)).toMatchObject({ holders: 2, countries: 1 });
  });

  it('ignores missing and empty countries', () => {
    const cards = [card({ allHolders: [holder('A', 'Q1'), holder('B', 'Q2', '')] })];
    expect(keyNumbers(cards).countries).toBe(0);
  });
});

describe('recentRepatriations', () => {
  const returned = (qid: string, returnedDate?: string) => card({ wpId: qid, returned: true, returnedDate });

  it('orders newest first with undated last, skipping non-returned', () => {
    const cards = [
      returned('Q1'),
      returned('Q2', '1999-05-02'),
      card({ wpId: 'Q3', returned: false, returnedDate: '2030-01-01' }),
      returned('Q4', '2024-11-01'),
    ];
    expect(recentRepatriations(cards).map((c) => c.wpId)).toEqual(['Q4', 'Q2', 'Q1']);
  });

  it('respects the limit', () => {
    const cards = [returned('Q1', '2001-01-01'), returned('Q2', '2002-01-01'), returned('Q3', '2003-01-01')];
    expect(recentRepatriations(cards, 2).map((c) => c.wpId)).toEqual(['Q3', 'Q2']);
  });
});
