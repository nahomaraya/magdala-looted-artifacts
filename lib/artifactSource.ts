// Server-only — single switch for where the review map / library read their
// artifacts from. Flip ARTIFACT_SOURCE without touching any UI:
//
//   'airtable' (default) — the legacy Airtable join (lib/getReviewArtifacts).
//   'wikidata'           — sourced entirely from Wikidata (lib/getWikidataArtifacts).
//   'merge'              — Wikidata items PLUS any Airtable row whose post URL
//                          isn't on Wikidata yet, deduped by URL. Keeps the site
//                          complete while items are still being minted.
//
// Default stays 'airtable' until minting is complete (see the refactor handoff).
import type { ArtifactCard } from './types';
import { getReviewArtifacts, type GetReviewArtifactsOptions } from './getReviewArtifacts';
import { getWikidataArtifacts } from './getWikidataArtifacts';

export type ArtifactSource = 'wikidata' | 'airtable' | 'merge';

export function getArtifactSource(): ArtifactSource {
  const v = (process.env.ARTIFACT_SOURCE ?? 'airtable').trim().toLowerCase();
  if (v === 'wikidata' || v === 'merge') return v;
  return 'airtable';
}

/** Order-insensitive URL key for deduping Wikidata items against Airtable rows. */
function urlKey(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * The artifact list for the chosen source. `opts` is forwarded to the Airtable
 * loader (it's a no-op for the Wikidata path, whose cards are always reviewable
 * and never touch the dedup queries).
 */
export async function getArtifacts(
  opts: GetReviewArtifactsOptions = {},
): Promise<ArtifactCard[]> {
  const source = getArtifactSource();

  if (source === 'airtable') return getReviewArtifacts(opts);
  if (source === 'wikidata') return getWikidataArtifacts();

  // merge: Wikidata is authoritative; add only the Airtable rows whose URL
  // hasn't been minted yet so the site stays complete during minting.
  const [wd, airtable] = await Promise.all([
    getWikidataArtifacts(),
    getReviewArtifacts(opts),
  ]);
  const minted = new Set(wd.map((c) => urlKey(c.url)).filter(Boolean));
  const extras = airtable.filter((c) => c.url && !minted.has(urlKey(c.url)));
  return [...wd, ...extras];
}
