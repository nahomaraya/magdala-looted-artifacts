import { describe, expect, it } from 'vitest';
import { PEEK_PX, SNAP_POINTS, clampCameraInset, classifySwipe, sheetHiddenPx, sheetInsetPx, snapToVaul, vaulToSnap } from './sheetGeometry';

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

describe('sheetHiddenPx', () => {
  // vaul translates a full-height sheet down by (viewport - visible), so this
  // much of it sits below the screen and must be padded out of the scroll area.
  it('peek hides everything but the peek bar', () => {
    expect(sheetHiddenPx('peek', 800)).toBe(800 - PEEK_PX);
  });

  it('half hides half the viewport', () => {
    expect(sheetHiddenPx('half', 800)).toBe(400);
  });

  it('full hides the top gap left above the sheet', () => {
    expect(sheetHiddenPx('full', 800)).toBe(64);
  });
});

describe('clampCameraInset', () => {
  // flyToBounds pads 70px each side; the inset must leave room to frame into,
  // or Leaflet's zoom maths goes NaN (zoom 19) or collapses to min zoom.
  it('leaves a tall map untouched', () => {
    expect(clampCameraInset(400, 1000)).toBe(400);
  });

  it('caps the inset on a short landscape map', () => {
    expect(clampCameraInset(180, 320)).toBe(100);
  });

  it('never goes negative on a tiny map', () => {
    expect(clampCameraInset(180, 150)).toBe(0);
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
