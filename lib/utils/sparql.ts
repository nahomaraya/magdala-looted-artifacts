// Shared SPARQL plumbing for the Wikidata-sourced read path.
//
// Server-side use only. The bulk artifact fetcher (lib/getWikidataArtifacts.ts)
// sends large `VALUES` blocks, which is why this uses POST instead of GET, and
// it can blow past WDQS's ~60 queries/minute anonymous limit on a hot reload,
// which is why this honours `Retry-After` / backs off on 429.
import { SPARQL_ENDPOINT, USER_AGENT } from '../constants';

export type Binding = Record<string, { value: string; type: string }>;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `http://www.wikidata.org/entity/Q42` → `Q42`. */
export function qidFromUri(uri: string): string {
  return uri.split('/').pop() ?? uri;
}

/**
 * POST-based SPARQL helper with retry on 429. WDQS rate-limits anonymous
 * traffic at ~60 queries/minute per IP, and on a hot page reload our read
 * pipelines can easily blow past that. We honour the `Retry-After` header
 * when WDQS sends one and fall back to exponential backoff otherwise.
 */
export async function sparqlPost(query: string, attempt = 0): Promise<Binding[]> {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({ query, format: 'json' }),
    cache: 'no-store',
  });

  if (res.status === 429 && attempt < 3) {
    const headerRetry = Number(res.headers.get('Retry-After'));
    const waitSeconds = Number.isFinite(headerRetry) && headerRetry > 0
      ? headerRetry
      : Math.pow(2, attempt) + Math.random();
    console.warn(`[sparql] WDQS 429 - retrying in ${waitSeconds.toFixed(1)}s (attempt ${attempt + 1}/3)`);
    await sleep(waitSeconds * 1000);
    return sparqlPost(query, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SPARQL ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.results.bindings as Binding[];
}
