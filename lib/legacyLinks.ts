import type { ArtifactCard } from '@/lib/types';

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();

/**
 * Resolves an old numeric WordPress id (from a legacy `?wpId=` link) to the
 * artifact's QID, by matching the post URL it mapped to against each card's
 * `url` (Wikidata P973). `legacy` maps `wp_id -> post URL`. Returns null for
 * anything that does not resolve, so callers can fall back to plain `/map`.
 */
export function resolveLegacyWpId(
  wpId: string,
  cards: ArtifactCard[],
  legacy: Record<string, string>,
): string | null {
  if (!/^\d+$/.test(wpId)) return null;
  const mapped = Object.hasOwn(legacy, wpId) ? legacy[wpId] : undefined;
  if (!mapped) return null;
  const target = normalizeUrl(mapped);
  return cards.find((c) => normalizeUrl(c.url) === target)?.wpId ?? null;
}
