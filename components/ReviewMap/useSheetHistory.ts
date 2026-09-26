import { useEffect, useRef } from 'react';
import { adoptedSheetDepth, sheetHistoryState } from './sheetHistoryState';

/**
 * Keeps one browser history entry per level of sheet depth, so the phone's
 * Back gesture steps back through the sheet instead of leaving the site.
 *
 * - Depth grows (drill in, open) → push entries.
 * - Depth shrinks from the UI (← button, drag to peek) → rewind history
 *   silently, so the next Back doesn't replay a level that's already gone.
 * - A real Back (popstate) → call `onBack`, which shrinks depth by exactly one
 *   (see `sheetDepth`), leaving history and sheet in step.
 * - Entries an earlier mount left behind are adopted on first sync, and all
 *   entries are rewound when the layout leaves compact mode.
 */
export function useSheetHistory(depth: number, onBack: () => void, enabled: boolean) {
  const pushed = useRef(0);
  const silentPops = useRef(0);
  const adopted = useRef(false);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) {
      // No popstate listener while disabled, so this rewind needs no silencing.
      if (pushed.current > 0) {
        window.history.go(-pushed.current);
        pushed.current = 0;
      }
      return;
    }
    if (!adopted.current) {
      adopted.current = true;
      pushed.current = adoptedSheetDepth(window.history.state);
    }
    if (depth > pushed.current) {
      for (let i = pushed.current; i < depth; i += 1) window.history.pushState(sheetHistoryState(i + 1), '');
      pushed.current = depth;
    } else if (depth < pushed.current) {
      // One history.go() fires one popstate, however many entries it skips.
      silentPops.current += 1;
      window.history.go(depth - pushed.current);
      pushed.current = depth;
    }
  }, [depth, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onPop = () => {
      if (silentPops.current > 0) {
        silentPops.current -= 1;
        return;
      }
      if (pushed.current === 0) return;
      pushed.current -= 1;
      onBackRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [enabled]);
}
