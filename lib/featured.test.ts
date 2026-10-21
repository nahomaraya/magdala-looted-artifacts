import { describe, expect, it } from 'vitest';
import { parsePins, selectFeatured } from '@/lib/featured';
import type { ArtifactCard } from '@/lib/types';

// ArtifactCard still carries fields removed in a later task, hence the cast.
function card(qid: string, title: string, holderName: string | null, imageUrls: string[] = []): ArtifactCard {
  const holder = holderName
    ? { name: holderName, qid: null, rawName: holderName, coords: [0, 0], source: 'wikidata' }
    : null;
  return {
    wpId: qid, slug: '', url: `https://example.com/${qid}`, title,
    weakLink: false, imageUrls, sourceLinks: [],
    holder, allHolders: holder ? [holder] : [], primaryCategory: null, allCategories: [],
  } as unknown as ArtifactCard;
}

describe('selectFeatured', () => {
  it('lists pinned first (image-less included), then imaged cards by holder then title', () => {
    const cards = [
      card('Q1', 'Zebra crown', 'British Museum', ['z.jpg']),
      card('Q2', 'Apple chalice', 'British Museum', ['a.jpg']),
      card('Q3', 'Cross', 'Armagh Library', ['c.jpg']),
      card('Q4', 'Orphan', null, ['o.jpg']),
      card('Q5', 'Pinned scroll', 'Louvre'),
    ];
    const result = selectFeatured(cards, [{ qid: 'Q5', text: 'A pinned note' }]);
    expect(result.map((f) => f.card.wpId)).toEqual(['Q5', 'Q3', 'Q2', 'Q1', 'Q4']);
    expect(result[0]).toMatchObject({ image: null, pinText: 'A pinned note' });
    expect(result[1]).toMatchObject({ image: 'c.jpg', pinText: null });
  });

  it('keeps pin order and skips unknown QIDs', () => {
    const cards = [card('Q1', 'One', 'A'), card('Q2', 'Two', 'A')];
    const pins = [
      { qid: 'Q2', text: 'second' },
      { qid: 'Q999', text: 'missing' },
      { qid: 'Q1', text: 'first' },
    ];
    expect(selectFeatured(cards, pins).map((f) => f.card.wpId)).toEqual(['Q2', 'Q1']);
  });

  it('uses the first text for a duplicated pin and lists the card once', () => {
    const cards = [card('Q1', 'One', 'A', ['1.jpg'])];
    const pins = [{ qid: 'Q1', text: 'first' }, { qid: 'Q1', text: 'second' }];
    const result = selectFeatured(cards, pins);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ image: '1.jpg', pinText: 'first' });
  });

  it('excludes a card with no image and no pin', () => {
    expect(selectFeatured([card('Q1', 'Bare', 'A')], [])).toEqual([]);
  });
});

describe('parsePins', () => {
  it('keeps well-formed pins and drops malformed ones', () => {
    const raw = { pins: [{ qid: 'Q1', text: 'ok' }, { qid: 12 }, { qid: 'Q1' }, { qid: 'x1', text: 'bad' }, null] };
    expect(parsePins(raw)).toEqual([{ qid: 'Q1', text: 'ok' }]);
  });

  it('returns [] for non-objects and a missing pins array', () => {
    expect(parsePins(null)).toEqual([]);
    expect(parsePins({})).toEqual([]);
    expect(parsePins('pins')).toEqual([]);
  });
});
