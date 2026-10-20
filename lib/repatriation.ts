import { ADDIS_ABABA_COORDS } from '@/lib/constants';
import type { ArtifactCard } from '@/lib/types';

const RETURNED_CATEGORY_PATTERN = /returned\s+plunder/i;
const ETHIOPIA_HOLDER_PATTERN = /national\s+museum\s+of\s+ethiopia/i;

/**
 * An artifact counts as returned to Ethiopia when ANY of these hold:
 *   - the data layer's `returned` flag is set;
 *   - it carries the source-site "Returned plunder" category;
 *   - any holder is the National Museum of Ethiopia.
 * The latter two are the reliable signals since the boolean is only sparsely
 * filled in. We scan every holder (not just the primary one) because the
 * Ethiopian holder often lacks a QID and so isn't chosen as the map pin's
 * primary holder.
 */
export function isReturned(card: ArtifactCard): boolean {
  if (card.returned) return true;
  if (
    card.allCategories.some(
      (c) => RETURNED_CATEGORY_PATTERN.test(c.name) || RETURNED_CATEGORY_PATTERN.test(c.rawName),
    )
  ) {
    return true;
  }
  if (card.where && ETHIOPIA_HOLDER_PATTERN.test(card.where)) return true;
  return card.allHolders.some(
    (h) => ETHIOPIA_HOLDER_PATTERN.test(h.name) || ETHIOPIA_HOLDER_PATTERN.test(h.rawName),
  );
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
