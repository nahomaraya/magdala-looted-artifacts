import {
  SPARQL_ENDPOINT,
  USER_AGENT,
  PROJECT_QID,
  LOOTING_QID,
  MAQDALA_BATTLE_QID,
  P_DESCRIBED_AT_URL,
} from './constants';
import { tokenSortRatio } from './utils/tokenSortRatio';

/**
 * Wikidata dedup for the Prince-and-Plunder pipeline. Mirrors `data/dedup.py`.
 *
 * Server-side use only — import from Server Components, Route Handlers, or
 * Server Actions. Do not import from a Client Component; the survey cache
 * is in-process and the fetch calls aren't designed to be hit from the
 * browser.
 *
 * Two strategies, first hit wins:
 *
 *  1. **P973 batch lookup.** One SPARQL VALUES query asks the endpoint whether
 *     any Wikidata item carries `P973 (described at URL)` pointing at each
 *     post URL we pass in. This is the canonical join key our QuickStatements
 *     uploads will install going forward.
 *
 *  2. **Fuzzy survey match.** Pull existing Maqdala-scope items (members of
 *     WikiProject Looted Heritage Q124538244 ∪ items with `looting` qualified
 *     by Battle-of-Magdala 1868) and fuzzy-match labels against artifact
 *     titles. Catches items already on Wikidata that don't yet carry P973.
 *
 * `checkArtifact(url, title)` is the single-row entry point intended for the
 * webapp's "Approve" button - always re-runs the live P973 check (cheap)
 * so two reviewers can't mint duplicates in parallel between page-load and
 * click. The survey query for the fuzzy fallback is cached in-process for
 * 24h to avoid hammering WDQS on every page.
 */

// ─── SPARQL plumbing ───────────────────────────────────────────────────────

type Binding = Record<string, { value: string; type: string }>;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * POST-based SPARQL helper with retry on 429. WDQS rate-limits anonymous
 * traffic at ~60 queries/minute per IP, and on a hot page reload the dedup
 * pipeline can easily blow past that. We honour the `Retry-After` header
 * when WDQS sends one and fall back to exponential backoff otherwise.
 *
 * The dedup pipeline can also send `VALUES` clauses with hundreds of URLs,
 * which is why this uses POST instead of GET.
 */
async function sparqlPost(query: string, attempt = 0): Promise<Binding[]> {
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
    console.warn(`[dedup] WDQS 429 - retrying in ${waitSeconds.toFixed(1)}s (attempt ${attempt + 1}/3)`);
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

function qidFromUri(uri: string): string {
  return uri.split('/').pop() ?? uri;
}

// ─── Strategy 1: exact P973 match ─────────────────────────────────────────

/**
 * Map every URL that's already linked via P973 to the existing Wikidata item.
 * Chunked at 200 per query because WDQS rejects very large VALUES blocks.
 */
const P973_TTL_MS = 5 * 60 * 1000;
const CHUNK_DELAY_MS = 600;
let p973Cache: { key: string; data: Map<string, string>; fetchedAt: number } | null = null;

/** Order-insensitive signature of a URL list, for cache keying. */
function batchSignature(urls: string[]): string {
  return urls.length + ':' + [...urls].sort().join('|');
}

export async function checkP973Batch(urls: string[]): Promise<Map<string, string>> {
  const cleaned = urls.filter(Boolean);
  if (cleaned.length === 0) return new Map();

  // Avoid hammering WDQS on back-to-back page renders. The same artifact
  // list passes the same cache key so the live dedup query only runs once
  // every P973_TTL_MS.
  const key = batchSignature(cleaned);
  if (p973Cache && p973Cache.key === key && Date.now() - p973Cache.fetchedAt < P973_TTL_MS) {
    return p973Cache.data;
  }

  const out = new Map<string, string>();
  const CHUNK = 200;
  for (let i = 0; i < cleaned.length; i += CHUNK) {
    if (i > 0) await sleep(CHUNK_DELAY_MS); // basic politeness between sub-queries
    const chunk = cleaned.slice(i, i + CHUNK);
    const values = chunk.map(u => `<${u}>`).join('\n        ');
    const query = `
      SELECT ?url ?item WHERE {
        VALUES ?url {
        ${values}
        }
        ?item wdt:${P_DESCRIBED_AT_URL} ?url .
      }`;
    const bindings = await sparqlPost(query);
    for (const b of bindings) {
      out.set(b.url.value, qidFromUri(b.item.value));
    }
  }

  p973Cache = { key, data: out, fetchedAt: Date.now() };
  return out;
}

/** Single-URL P973 check for the "Approve" button. */
export async function checkP973(url: string): Promise<string | null> {
  if (!url) return null;
  const map = await checkP973Batch([url]);
  return map.get(url) ?? null;
}

// ─── Strategy 2: fuzzy match against the Maqdala-scope survey ─────────────

export interface SurveyItem {
  qid: string;
  label: string;
  desc: string;
  holders: string[];      // English labels of P195 collection statements
  holderQids: string[];   // bare Q-IDs for boosting the fuzzy match
}

const SURVEY_TTL_MS = 24 * 60 * 60 * 1000;
let surveyCache: { data: SurveyItem[]; fetchedAt: number } | null = null;

/**
 * All Wikidata items in the Maqdala scope - cached in-process for 24h.
 *
 * Pass `{ refresh: true }` to bust the cache. Note that module-scoped caches
 * don't survive serverless cold starts; for production deploys on Vercel
 * you may want to swap this for `unstable_cache` from `next/cache`.
 */
export async function surveyItems(opts: { refresh?: boolean } = {}): Promise<SurveyItem[]> {
  if (!opts.refresh && surveyCache && Date.now() - surveyCache.fetchedAt < SURVEY_TTL_MS) {
    return surveyCache.data;
  }

  const query = `
    SELECT ?item ?itemLabel ?itemDescription
           (GROUP_CONCAT(DISTINCT ?holderLabel; separator="|") AS ?holders)
           (GROUP_CONCAT(DISTINCT ?holder;      separator="|") AS ?holder_uris)
    WHERE {
      {
        SELECT DISTINCT ?item WHERE {
          { ?item wdt:P5008 wd:${PROJECT_QID} . }
          UNION
          { ?item p:P793 ?st .
            ?st ps:P793 wd:${LOOTING_QID} ;
                pq:P585 ?time ;
                pq:P2348 wd:${MAQDALA_BATTLE_QID} .
            FILTER(YEAR(?time) = 1868)
          }
        }
      }
      OPTIONAL {
        ?item wdt:P195 ?holder .
        ?holder rdfs:label ?holderLabel . FILTER(LANG(?holderLabel) = "en")
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?item ?itemLabel ?itemDescription
  `;

  const bindings = await sparqlPost(query);
  const data: SurveyItem[] = bindings.map(b => ({
    qid:   qidFromUri(b.item.value),
    label: b.itemLabel?.value ?? '',
    desc:  b.itemDescription?.value ?? '',
    holders:    (b.holders?.value     ?? '').split('|').filter(Boolean),
    holderQids: (b.holder_uris?.value ?? '').split('|').filter(Boolean).map(qidFromUri),
  }));
  surveyCache = { data, fetchedAt: Date.now() };
  return data;
}

/**
 * Best survey-item match for `title`, optionally boosted when `holderQid`
 * is also a known P195 of the candidate. Returns null if nothing crosses
 * the threshold (default 80).
 */
export function fuzzyMatch(
  title: string,
  survey: SurveyItem[],
  opts: { holderQid?: string; threshold?: number } = {},
): { qid: string; confidence: number; item: SurveyItem } | null {
  const threshold = opts.threshold ?? 80;
  const t = (title ?? '').trim();
  if (!t || survey.length === 0) return null;

  let best: { qid: string; confidence: number; item: SurveyItem } | null = null;
  for (const item of survey) {
    if (!item.label) continue;
    let score = tokenSortRatio(t, item.label);
    if (opts.holderQid && item.holderQids.includes(opts.holderQid)) {
      score = Math.min(100, score + 10);
    }
    if (!best || score > best.confidence) {
      best = { qid: item.qid, confidence: score, item };
    }
  }
  return best && best.confidence >= threshold ? best : null;
}

// ─── Webapp-facing API ────────────────────────────────────────────────────

export type DedupMethod = 'p973' | 'fuzzy' | 'none';

export interface DedupResult {
  exists: boolean;
  qid: string | null;
  method: DedupMethod;
  confidence: number;        // 0-100; 100 for P973 hits
  matchedLabel?: string;
  matchedDesc?: string;
}

/**
 * Single-artifact dedup for the webapp's "Approve" button.
 *
 * The P973 check is live (one round-trip) so two reviewers can't create
 * duplicates in parallel between page-load and click. The fuzzy fallback
 * uses the in-process survey cache.
 */
export async function checkArtifact(
  postUrl: string,
  title = '',
  opts: { holderQid?: string; threshold?: number } = {},
): Promise<DedupResult> {
  const p973Hit = await checkP973(postUrl);
  if (p973Hit) {
    return { exists: true, qid: p973Hit, method: 'p973', confidence: 100 };
  }

  if (title) {
    const survey = await surveyItems();
    const match = fuzzyMatch(title, survey, opts);
    if (match) {
      return {
        exists: true,
        qid: match.qid,
        method: 'fuzzy',
        confidence: match.confidence,
        matchedLabel: match.item.label,
        matchedDesc:  match.item.desc,
      };
    }
  }

  return { exists: false, qid: null, method: 'none', confidence: 0 };
}

/**
 * Batched version for rendering the whole list at once. Uses one SPARQL
 * round-trip for the P973 part and one for the survey, then matches in
 * memory. Drop this into a Server Component to enrich the artifact list
 * before passing it to the map.
 */
export async function batchCheckArtifacts(
  artifacts: { url: string; title: string; holderQid?: string }[],
  opts: { threshold?: number } = {},
): Promise<Map<string, DedupResult>> {
  const urls = artifacts.map(a => a.url).filter(Boolean);
  const [p973Map, survey] = await Promise.all([
    checkP973Batch(urls),
    surveyItems(),
  ]);

  const out = new Map<string, DedupResult>();
  for (const a of artifacts) {
    const p973Hit = a.url ? p973Map.get(a.url) : undefined;
    if (p973Hit) {
      out.set(a.url, { exists: true, qid: p973Hit, method: 'p973', confidence: 100 });
      continue;
    }
    const m = a.title ? fuzzyMatch(a.title, survey, {
      holderQid: a.holderQid, threshold: opts.threshold,
    }) : null;
    out.set(a.url, m
      ? {
          exists: true, qid: m.qid, method: 'fuzzy',
          confidence: m.confidence,
          matchedLabel: m.item.label, matchedDesc: m.item.desc,
        }
      : { exists: false, qid: null, method: 'none', confidence: 0 });
  }
  return out;
}
