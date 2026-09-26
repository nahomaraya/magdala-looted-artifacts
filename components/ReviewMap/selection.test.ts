import { describe, expect, it } from 'vitest';
import { reconcileSelection, stepIndex } from './selection';

describe('reconcileSelection', () => {
  const ids = ['a', 'b', 'c'];

  it('keeps a chosen artifact that is still in scope', () => {
    expect(reconcileSelection(ids, 'b', 'compact')).toBe('b');
    expect(reconcileSelection(ids, 'b', 'wide')).toBe('b');
  });

  it('wide layout falls back to the first artifact', () => {
    expect(reconcileSelection(ids, null, 'wide')).toBe('a');
    expect(reconcileSelection(ids, 'gone', 'wide')).toBe('a');
  });

  it('compact layout leaves nothing selected until the reader picks', () => {
    expect(reconcileSelection(ids, null, 'compact')).toBeNull();
    expect(reconcileSelection(ids, 'gone', 'compact')).toBeNull();
  });

  it('unknown layout (before mount) does not auto-select', () => {
    expect(reconcileSelection(ids, null, null)).toBeNull();
    expect(reconcileSelection(ids, 'b', null)).toBe('b');
  });

  it('empty scope selects nothing', () => {
    expect(reconcileSelection([], null, 'wide')).toBeNull();
  });
});

describe('stepIndex', () => {
  it('steps forward and wraps', () => {
    expect(stepIndex(3, 0, 1)).toBe(1);
    expect(stepIndex(3, 2, 1)).toBe(0);
  });

  it('steps backward and wraps', () => {
    expect(stepIndex(3, 0, -1)).toBe(2);
  });

  it('starts at the first artifact when nothing is selected', () => {
    expect(stepIndex(3, -1, 1)).toBe(0);
    expect(stepIndex(3, -1, -1)).toBe(0);
  });
});
