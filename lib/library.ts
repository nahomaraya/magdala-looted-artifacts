import type { ArtifactCard } from './types';

const LIBRARY_CATEGORY_PATTERN = /\b(?:book|books|manuscript|manuscripts)\b/i;

/** True when any of the artifact's categories names a book or manuscript. */
export function isLibraryArtifact(card: ArtifactCard): boolean {
  return card.allCategories.some(
    (category) => LIBRARY_CATEGORY_PATTERN.test(category.name) || LIBRARY_CATEGORY_PATTERN.test(category.rawName),
  );
}

/** The books and manuscripts among `cards`, sorted by title. */
export function libraryArtifacts(cards: ArtifactCard[]): ArtifactCard[] {
  return cards
    .filter(isLibraryArtifact)
    .sort((left, right) => left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }));
}
