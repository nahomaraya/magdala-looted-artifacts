import { describe, expect, it } from 'vitest';
import { adoptedSheetDepth, sheetHistoryState } from './sheetHistoryState';

describe('sheet history entries', () => {
  it('tags each pushed entry with its depth', () => {
    expect(sheetHistoryState(3)).toEqual({ lootedSheet: 3 });
  });

  it('adopts entries left by an earlier mount (reload, back from the library)', () => {
    expect(adoptedSheetDepth({ __NA: true, lootedSheet: 3 })).toBe(3);
  });

  it('adopts nothing from a plain entry', () => {
    expect(adoptedSheetDepth({ __NA: true })).toBe(0);
    expect(adoptedSheetDepth(null)).toBe(0);
    expect(adoptedSheetDepth({ lootedSheet: 'x' })).toBe(0);
  });
});
