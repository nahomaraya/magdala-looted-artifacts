/**
 * `tokenSortRatio(a, b)` — 0-to-100 fuzzy similarity score, modelled on
 * rapidfuzz's `fuzz.token_sort_ratio` in the Python pipeline:
 *
 *   1. lowercase both strings, collapse whitespace
 *   2. split into tokens, sort them alphabetically, rejoin with single spaces
 *   3. score similarity using normalised Levenshtein distance
 *
 * Note: rapidfuzz uses Indel (LCS-based) distance not Levenshtein, so scores
 * here will differ by a few points. Rankings stay essentially the same, which
 * is what the dedup threshold (default 80) cares about. If you ever need
 * byte-identical scores to the Python pipeline, swap in `fuzzball.js`.
 */
function tokenSort(s: string): string {
  return s.toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function tokenSortRatio(a: string, b: string): number {
  const aSorted = tokenSort(a);
  const bSorted = tokenSort(b);
  const maxLen = Math.max(aSorted.length, bSorted.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(aSorted, bSorted);
  return Math.round((1 - dist / maxLen) * 100);
}
