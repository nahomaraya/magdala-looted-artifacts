import type { LayoutMode } from './useLayoutMode';

/**
 * Which artifact is selected, given what the reader chose and what's in scope.
 * Wide layouts always show something in the artifact pane; compact layouts
 * leave the selection empty until the reader picks one.
 */
export function reconcileSelection(
  wpIds: string[],
  chosen: string | null,
  mode: LayoutMode | null,
): string | null {
  if (chosen && wpIds.includes(chosen)) return chosen;
  return mode === 'wide' ? (wpIds[0] ?? null) : null;
}

/** Next/previous index with wrap-around; no selection starts at the first. */
export function stepIndex(length: number, index: number, dir: 1 | -1): number {
  if (index < 0) return 0;
  return (index + dir + length) % length;
}
