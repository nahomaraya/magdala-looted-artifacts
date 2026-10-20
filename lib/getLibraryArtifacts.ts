import { getWikidataArtifacts } from './getWikidataArtifacts';
import type { ArtifactCard } from './types';

const LIBRARY_CATEGORY_PATTERN = /\b(?:book|books|manuscript|manuscripts)\b/i;

function matchesLibraryCategory(artifact: ArtifactCard): boolean {
  return artifact.allCategories.some((category) => {
    return LIBRARY_CATEGORY_PATTERN.test(category.name) || LIBRARY_CATEGORY_PATTERN.test(category.rawName);
  });
}

export async function getLibraryArtifacts(): Promise<ArtifactCard[]> {
  const artifacts = await getWikidataArtifacts();
  return artifacts
    .filter(matchesLibraryCategory)
    .sort((left, right) => left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }));
}