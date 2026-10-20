import { describe, it, expect } from 'vitest';
import { assembleCard, type ItemFields, type HolderRow } from './wikidataCards';

function fields(overrides: Partial<ItemFields> = {}): ItemFields {
  return {
    types: [],
    imageUrls: [],
    weakLink: false,
    references: [],
    returnDates: [],
    hasReturnEvent: false,
    ...overrides,
  };
}

function holderRow(overrides: Partial<HolderRow> = {}): HolderRow {
  return { qid: 'Q6373', label: 'British Museum', rel: 'P276', ...overrides };
}

describe('assembleCard', () => {
  it('marks an item with a return event as returned, with the latest date', () => {
    const card = assembleCard(
      'Q100',
      fields({
        returnDates: ['1872-01-01T00:00:00Z', '2024-11-01T00:00:00Z'],
        hasReturnEvent: true,
      }),
      [],
      new Map(),
    );
    expect(card.returned).toBe(true);
    expect(card.returnedDate).toBe('2024-11-01');
  });

  it('marks a return event without a date as returned, undated', () => {
    const card = assembleCard('Q100', fields({ hasReturnEvent: true }), [], new Map());
    expect(card.returned).toBe(true);
    expect(card.returnedDate).toBeUndefined();
  });

  it('does not mark an NME-held item without a return event as returned', () => {
    const card = assembleCard(
      'Q100',
      fields({ hasReturnEvent: false }),
      [holderRow({ qid: 'Q2652168', label: 'National Museum of Ethiopia' })],
      new Map(),
    );
    expect(card.returned).toBe(false);
  });

  it('drops looted art / looted property labels from categories', () => {
    const card = assembleCard(
      'Q100',
      fields({ types: ['Q1', 'Q2', 'Q3'] }),
      [],
      new Map([
        ['Q1', 'looted property'],
        ['Q2', 'manuscript'],
        ['Q3', 'Looted Art'],
      ]),
    );
    expect(card.allCategories.map((c) => c.name)).toEqual(['manuscript']);
    expect(card.primaryCategory?.name).toBe('manuscript');
  });

  it('carries holder country through', () => {
    const card = assembleCard(
      'Q100',
      fields(),
      [holderRow({ country: 'United Kingdom' })],
      new Map(),
    );
    expect(card.holder?.country).toBe('United Kingdom');
  });
});
