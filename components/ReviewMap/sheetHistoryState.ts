/** History-entry state the sheet pushes; Next.js copies its own keys alongside. */
export function sheetHistoryState(depth: number): { lootedSheet: number } {
  return { lootedSheet: depth };
}

/**
 * How many sheet entries sit under the current history entry when the map
 * mounts. A reload or a Back from the library lands on an entry an earlier
 * mount pushed; adopting them lets the first sync rewind them instead of
 * leaving dead Back presses behind.
 */
export function adoptedSheetDepth(state: unknown): number {
  const depth = (state as { lootedSheet?: unknown } | null)?.lootedSheet;
  return typeof depth === 'number' && depth > 0 ? depth : 0;
}
