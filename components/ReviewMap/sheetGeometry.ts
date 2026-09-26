import type { SheetSnap } from './sheetNav';

/** Peek bar height; must match the first snap point. */
export const PEEK_PX = 96;

/** vaul snap points, in SheetSnap order: peek, half, full. */
export const SNAP_POINTS: (string | number)[] = [`${PEEK_PX}px`, 0.5, 0.92];

const SNAPS: SheetSnap[] = ['peek', 'half', 'full'];

export function snapToVaul(snap: SheetSnap): string | number {
  return SNAP_POINTS[SNAPS.indexOf(snap)];
}

export function vaulToSnap(value: string | number | null): SheetSnap {
  const i = value === null ? -1 : SNAP_POINTS.indexOf(value);
  return i < 0 ? 'peek' : SNAPS[i];
}

/**
 * How many pixels at the bottom of the map the sheet hides, for camera framing.
 * A full sheet leaves almost no map, so frame as if half-open — that's what
 * the reader sees once they pull it back down.
 */
export function sheetInsetPx(snap: SheetSnap, viewportHeight: number): number {
  if (snap === 'peek') return PEEK_PX;
  return Math.round(viewportHeight * 0.5);
}

const MIN_SWIPE_PX = 56;

/** Horizontal swipe on the artifact card → step; anything vertical-ish is the sheet's. */
export function classifySwipe(dx: number, dy: number): 'next' | 'prev' | null {
  if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 'next' : 'prev';
}
