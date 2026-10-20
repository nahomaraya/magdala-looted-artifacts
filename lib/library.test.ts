import { describe, expect, it } from 'vitest';
import { isLibraryArtifact, libraryArtifacts } from '@/lib/library';
import type { ArtifactCard, ResolvedCategory } from '@/lib/types';

function card(over: Partial<ArtifactCard> = {}): ArtifactCard {
  return {
    wpId: 'Q1', slug: '', url: 'https://example.com/Q1', title: 'Artifact',
    weakLink: false, imageUrls: [], sourceLinks: [],
    holder: null, allHolders: [], primaryCategory: null, allCategories: [],
    ...over,
  } as unknown as ArtifactCard;
}

// Only the name fields matter to the library rule.
const category = (name: string) => ({ name, rawName: name }) as unknown as ResolvedCategory;

describe('isLibraryArtifact', () => {
  it('matches a manuscript category', () => {
    expect(isLibraryArtifact(card({ allCategories: [category('manuscript')] }))).toBe(true);
  });

  it('rejects a category that is not a book or manuscript', () => {
    expect(isLibraryArtifact(card({ allCategories: [category('icon')] }))).toBe(false);
  });
});

describe('libraryArtifacts', () => {
  it('keeps library artifacts only, sorted by title ignoring case', () => {
    const manuscript = [category('manuscript')];
    const cards = [
      card({ wpId: 'Q1', title: 'b', allCategories: manuscript }),
      card({ wpId: 'Q2', title: 'A', allCategories: manuscript }),
      card({ wpId: 'Q3', title: 'c', allCategories: manuscript }),
      card({ wpId: 'Q4', title: 'a cross', allCategories: [category('icon')] }),
    ];
    expect(libraryArtifacts(cards).map((c) => c.title)).toEqual(['A', 'b', 'c']);
  });
});
