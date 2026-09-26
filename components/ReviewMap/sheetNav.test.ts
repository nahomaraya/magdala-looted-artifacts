import { describe, expect, it } from 'vitest';
import {
  initSheet,
  reduceSheet,
  resolveMarkerTap,
  sessionTargetFor,
  sheetDepth,
  type SheetState,
} from './sheetNav';

const holders: SheetState = { view: { level: 'holders' }, snap: 'peek' };

describe('initSheet', () => {
  it('starts collapsed on the holders list', () => {
    expect(initSheet(null)).toEqual({ view: { level: 'holders' }, snap: 'peek' });
  });

  it('opens a deep-linked artifact at half height with no holder focus', () => {
    expect(initSheet('42')).toEqual({
      view: { level: 'artifact', wpId: '42', holderKey: null },
      snap: 'half',
    });
  });
});

describe('reduceSheet', () => {
  it('openHolder drills in and raises a peeking sheet to half', () => {
    expect(reduceSheet(holders, { type: 'openHolder', holderKey: 'British Museum' })).toEqual({
      view: { level: 'holder', holderKey: 'British Museum' },
      snap: 'half',
    });
  });

  it('openHolder keeps a full sheet full', () => {
    const full: SheetState = { ...holders, snap: 'full' };
    expect(reduceSheet(full, { type: 'openHolder', holderKey: 'X' }).snap).toBe('full');
  });

  it('openArtifact drills in and raises to half', () => {
    expect(reduceSheet(holders, { type: 'openArtifact', wpId: '7', holderKey: 'X' })).toEqual({
      view: { level: 'artifact', wpId: '7', holderKey: 'X' },
      snap: 'half',
    });
  });

  it('showArtifact swaps the artifact in place, keeping holder and snap', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'full' };
    expect(reduceSheet(s, { type: 'showArtifact', wpId: '8' })).toEqual({
      view: { level: 'artifact', wpId: '8', holderKey: 'X' },
      snap: 'full',
    });
  });

  it('showArtifact is a no-op outside the artifact level', () => {
    expect(reduceSheet(holders, { type: 'showArtifact', wpId: '8' })).toBe(holders);
  });

  it('showHolders keeps the current snap by default (filter chip toggle)', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'peek' };
    expect(reduceSheet(s, { type: 'showHolders' })).toEqual({ view: { level: 'holders' }, snap: 'peek' });
  });

  it('showHolders with open raises to half (mixed-holder pin tap)', () => {
    expect(reduceSheet(holders, { type: 'showHolders', open: true }).snap).toBe('half');
  });

  it('back from an artifact with a holder returns to that holder', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'half' };
    expect(reduceSheet(s, { type: 'back' })).toEqual({
      view: { level: 'holder', holderKey: 'X' },
      snap: 'half',
    });
  });

  it('back from a deep-linked artifact (no holder) returns to holders', () => {
    const s: SheetState = { view: { level: 'artifact', wpId: '7', holderKey: null }, snap: 'half' };
    expect(reduceSheet(s, { type: 'back' }).view).toEqual({ level: 'holders' });
  });

  it('back from a holder returns to holders', () => {
    const s: SheetState = { view: { level: 'holder', holderKey: 'X' }, snap: 'full' };
    expect(reduceSheet(s, { type: 'back' })).toEqual({ view: { level: 'holders' }, snap: 'full' });
  });

  it('back on an open holders list collapses to peek', () => {
    const s: SheetState = { view: { level: 'holders' }, snap: 'half' };
    expect(reduceSheet(s, { type: 'back' })).toEqual(holders);
  });

  it('back at the root is a no-op', () => {
    expect(reduceSheet(holders, { type: 'back' })).toBe(holders);
  });

  it('setSnap to the current snap is a no-op', () => {
    expect(reduceSheet(holders, { type: 'setSnap', snap: 'peek' })).toBe(holders);
  });
});

describe('sheetDepth', () => {
  it('is 0 at the collapsed root', () => {
    expect(sheetDepth(holders)).toBe(0);
  });

  it('counts an open sheet plus each drill-in level', () => {
    expect(sheetDepth({ view: { level: 'holders' }, snap: 'half' })).toBe(1);
    expect(sheetDepth({ view: { level: 'holder', holderKey: 'X' }, snap: 'half' })).toBe(2);
    expect(sheetDepth({ view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'full' })).toBe(3);
    expect(sheetDepth({ view: { level: 'artifact', wpId: '7', holderKey: null }, snap: 'half' })).toBe(2);
  });

  it('dropping to peek does not hide the level depth', () => {
    expect(sheetDepth({ view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'peek' })).toBe(2);
  });

  it('every non-root back reduces depth by exactly one', () => {
    const states: SheetState[] = [
      { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'full' },
      { view: { level: 'artifact', wpId: '7', holderKey: 'X' }, snap: 'peek' },
      { view: { level: 'artifact', wpId: '7', holderKey: null }, snap: 'half' },
      { view: { level: 'holder', holderKey: 'X' }, snap: 'half' },
      { view: { level: 'holder', holderKey: 'X' }, snap: 'peek' },
      { view: { level: 'holders' }, snap: 'full' },
    ];
    for (const s of states) {
      expect(sheetDepth(reduceSheet(s, { type: 'back' }))).toBe(sheetDepth(s) - 1);
    }
  });
});

describe('sessionTargetFor', () => {
  it('holders → no holder focus, no selection', () => {
    expect(sessionTargetFor({ level: 'holders' })).toEqual({ holderKey: null, wpId: null });
  });

  it('holder → holder focus, no selection', () => {
    expect(sessionTargetFor({ level: 'holder', holderKey: 'X' })).toEqual({ holderKey: 'X', wpId: null });
  });

  it('artifact → its holder focus and selection', () => {
    expect(sessionTargetFor({ level: 'artifact', wpId: '7', holderKey: 'X' })).toEqual({
      holderKey: 'X',
      wpId: '7',
    });
  });
});

describe('resolveMarkerTap', () => {
  it('a single-artifact pin opens that artifact under its holder', () => {
    expect(resolveMarkerTap([{ wpId: '7', holderKey: 'X' }])).toEqual({
      type: 'openArtifact',
      wpId: '7',
      holderKey: 'X',
    });
  });

  it('a one-holder pin opens that holder', () => {
    expect(
      resolveMarkerTap([
        { wpId: '7', holderKey: 'X' },
        { wpId: '8', holderKey: 'X' },
      ]),
    ).toEqual({ type: 'openHolder', holderKey: 'X' });
  });

  it('a mixed-holder pin (e.g. returned artifacts at Addis Ababa) opens the holders list', () => {
    expect(
      resolveMarkerTap([
        { wpId: '7', holderKey: 'British Museum' },
        { wpId: '8', holderKey: 'National Museum of Ethiopia' },
      ]),
    ).toEqual({ type: 'showHolders', open: true });
  });

  it('an empty pin does nothing', () => {
    expect(resolveMarkerTap([])).toBeNull();
  });
});
