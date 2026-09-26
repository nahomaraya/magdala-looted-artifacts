import { useEffect, useRef } from 'react';

/**
 * Keeps one browser history entry per level of sheet depth, so the phone's
 * Back gesture steps back through the sheet instead of leaving the site.
 *
 * - Depth grows (drill in, open) → push entries.
 * - Depth shrinks from the UI (← button, drag to peek) → rewind history
 *   silently, so the next Back doesn't replay a level that's already gone.
 * - A real Back (popstate) → call `onBack`, which shrinks depth by exactly one
 *   (see `sheetDepth`), leaving history and sheet in step.
 */
export function useSheetHistory(depth: number, onBack: () => void, enabled: boolean) {
  const pushed = useRef(0);
  const silentPops = useRef(0);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    if (depth > pushed.current) {
      for (let i = pushed.current; i < depth; i += 1) window.history.pushState({ lootedSheet: i + 1 }, '');
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
