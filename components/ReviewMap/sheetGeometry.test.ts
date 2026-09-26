import { describe, expect, it } from 'vitest';
import { PEEK_PX, SNAP_POINTS, classifySwipe, sheetInsetPx, snapToVaul, vaulToSnap } from './sheetGeometry';

describe('snap mapping', () => {
  it('round-trips every snap through vaul values', () => {
    for (const snap of ['peek', 'half', 'full'] as const) {
      expect(vaulToSnap(snapToVaul(snap))).toBe(snap);
    }
  });

  it('maps to the configured snap points in order', () => {
    expect(SNAP_POINTS).toEqual(['96px', 0.5, 0.92]);
    expect(snapToVaul('peek')).toBe('96px');
  });

  it('treats an unknown or null vaul value as peek', () => {
    expect(vaulToSnap(null)).toBe('peek');
    expect(vaulToSnap(0.33)).toBe('peek');
  });
});

describe('sheetInsetPx', () => {
  it('peek covers the peek bar', () => {
    expect(sheetInsetPx('peek', 800)).toBe(PEEK_PX);
  });

  it('half covers half the viewport', () => {
    expect(sheetInsetPx('half', 800)).toBe(400);
  });

  it('full is capped at half so the camera still frames the upper map', () => {
    expect(sheetInsetPx('full', 800)).toBe(400);
  });
});

describe('classifySwipe', () => {
  it('a clear leftward swipe goes to the next artifact', () => {
    expect(classifySwipe(-80, 5)).toBe('next');
  });

  it('a clear rightward swipe goes to the previous artifact', () => {
    expect(classifySwipe(80, -5)).toBe('prev');
  });

  it('ignores short drags', () => {
    expect(classifySwipe(-40, 0)).toBeNull();
  });

  it('ignores mostly-vertical drags (sheet scrolling or dragging)', () => {
    expect(classifySwipe(-80, 70)).toBeNull();
  });
});
