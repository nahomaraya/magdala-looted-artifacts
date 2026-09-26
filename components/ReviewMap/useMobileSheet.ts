import { useCallback, useEffect, useRef, useState } from 'react';
import { initSheet, reduceSheet, type SheetAction, type SheetState, type SheetView } from './sheetNav';

/**
 * React adapter over `sheetNav`. `dispatch` reduces against the latest state
 * (not a render closure), so it is safe to call from a popstate listener, and
 * reports view changes synchronously so the caller can move the review
 * session in the same batch as the sheet.
 */
export function useMobileSheet(
  initialWpId: string | null,
  onViewChange: (next: SheetView, prev: SheetView) => void,
) {
  const [sheet, setSheet] = useState<SheetState>(() => initSheet(initialWpId));
  const sheetRef = useRef(sheet);
  const onViewChangeRef = useRef(onViewChange);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  const dispatch = useCallback((action: SheetAction) => {
    const prev = sheetRef.current;
    const next = reduceSheet(prev, action);
    if (next === prev) return;
    sheetRef.current = next;
    setSheet(next);
    if (next.view !== prev.view) onViewChangeRef.current(next.view, prev.view);
  }, []);

  return { sheet, dispatch };
}
