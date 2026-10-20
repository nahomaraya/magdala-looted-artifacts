import { ADDIS_ABABA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';

/**
 * An artifact is returned exactly when Wikidata records a return event for it
 * (a P793 "return" statement); the data layer sets `returned` from that. Neither
 * the holder nor a category implies it: an item held in Addis Ababa without a
 * recorded return is not returned.
 */
export function isReturned(card: ArtifactCard): boolean {
  return card.returned === true;
}

/**
 * Where an artifact sits on the map. Returned artifacts default to the National
 * Museum of Ethiopia in Addis Ababa, overriding whatever their prior holder
 * resolved to; everything else uses its holder's coordinates.
 *
 * This is the single coords function: pins, the Magdala polyline and the
 * camera fly-to all call it, so they cannot disagree.
 */
export function displayCoords(card: ArtifactCard): [number, number] | undefined {
  if (isReturned(card)) return ADDIS_ABABA_COORDS;
  return card.holder?.coords;
}
