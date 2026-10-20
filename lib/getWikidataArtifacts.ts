// Server-only — sources the review map / library straight from Wikidata.
//
// Pipeline (see docs/wikidata-source-refactor.md):
//   1. discover the in-scope item QIDs in ONE query (Q1)
//   2. project every field in a few chunked VALUES queries (Q2 fields,
//      Q3 holders, Q4 category labels) — no per-item REST calls
//   3. assemble ArtifactCard[] so downstream components keep working unchanged.
//
// Total SPARQL round-trips = 2 (discover + category labels) + 2*ceil(N/CHUNK)
// (one Q2 + one Q3 per chunk). For ~600 items that is a handful of queries.
import { unstable_cache } from 'next/cache';
import {
  PROJECT_QID,
  LOOTING_QID,
  MAQDALA_BATTLE_QID,
  BRITISH_EXPEDITION_QID,
  RETURN_EVENT_QID,
} from './constants';
import { sparqlPost, qidFromUri, type Binding } from './utils/sparql';
import { parseWktCoords } from './wikidata';
import {
  bindingToItemFields,
  assembleCard,
  type ItemFields,
  type HolderRow,
} from './wikidataCards';
import type { ArtifactCard } from './types';

/** Inject at most this many QIDs into a single VALUES block. */
const CHUNK = 150;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ─── Q1: discovery ─────────────────────────────────────────────────────────

/**
 * Items on the WikiProject Looted Heritage focus list whose looting statement
 * is qualified by time period = British expedition to Abyssinia (P2348) AND
 * has cause = Battle of Magdala (P828). All three conditions are required.
 */
async function discoverArtifactQIDs(): Promise<string[]> {
  const query = `
    SELECT ?Item ?ItemLabel ?ItemDescription WHERE {
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      ?Item wdt:P5008 wd:${PROJECT_QID}.
      ?Item p:P793 ?stmt.
      ?stmt ps:P793 wd:${LOOTING_QID}.
      ?stmt pq:P2348 wd:${BRITISH_EXPEDITION_QID}.
      ?stmt pq:P828 wd:${MAQDALA_BATTLE_QID}.
    }`;
  const bindings = await sparqlPost(query);
  return bindings.map((b) => qidFromUri(b.Item.value));
}

// ─── Q2: per-item fields ─────────────────────────────────────────────────────

async function fetchItemFields(qids: string[]): Promise<Map<string, ItemFields>> {
  const out = new Map<string, ItemFields>();
  for (const part of chunk(qids, CHUNK)) {
    const values = part.map((q) => `wd:${q}`).join(' ');
    const query = `
      SELECT ?item ?itemLabel ?itemDescription ?article
             (GROUP_CONCAT(DISTINCT ?type;       separator="|") AS ?types)
             (GROUP_CONCAT(DISTINCT ?image;      separator="|") AS ?images)
             (GROUP_CONCAT(DISTINCT ?confidence; separator="|") AS ?confidences)
             (GROUP_CONCAT(DISTINCT ?refUrl;     separator="|") AS ?refs)
             (GROUP_CONCAT(DISTINCT ?rs;         separator="|") AS ?returns)
             (GROUP_CONCAT(DISTINCT ?returnDate; separator="|") AS ?returnDates)
      WHERE {
        VALUES ?item { ${values} }
        OPTIONAL { ?item wdt:P973 ?article }
        OPTIONAL { ?item wdt:P18  ?image }
        OPTIONAL { ?item wdt:P31  ?type }
        OPTIONAL {
          ?item p:P793 ?st . ?st ps:P793 wd:${LOOTING_QID} .
          OPTIONAL { ?st pq:P5102 ?confidence }
          OPTIONAL { ?st prov:wasDerivedFrom/pr:P854 ?refUrl }
        }
        OPTIONAL {
          ?item p:P793 ?rs . ?rs ps:P793 wd:${RETURN_EVENT_QID} .
          OPTIONAL { ?rs pq:P585 ?returnDate }
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,am". }
      }
      GROUP BY ?item ?itemLabel ?itemDescription ?article`;
    const bindings = await sparqlPost(query);
    for (const b of bindings) {
      const qid = qidFromUri(b.item.value);
      out.set(qid, bindingToItemFields(b));
    }
  }
  return out;
}

// ─── Q3: holders (P276 location + P195 collection) ──────────────────────────

async function fetchHolders(qids: string[]): Promise<Map<string, HolderRow[]>> {
  const out = new Map<string, HolderRow[]>();
  for (const part of chunk(qids, CHUNK)) {
    const values = part.map((q) => `wd:${q}`).join(' ');
    const query = `
      SELECT ?item ?holder ?holderLabel ?coords ?countryLabel ?rel WHERE {
        VALUES ?item { ${values} }
        { ?item wdt:P276 ?holder . BIND("P276" AS ?rel) }
        UNION
        { ?item wdt:P195 ?holder . BIND("P195" AS ?rel) }
        OPTIONAL { ?holder wdt:P625 ?coords }
        OPTIONAL { ?holder wdt:P17 ?country }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }`;
    const bindings = await sparqlPost(query);
    for (const b of bindings) {
      const item = qidFromUri(b.item.value);
      const holderQid = qidFromUri(b.holder.value);
      const row: HolderRow = {
        qid: holderQid,
        label: b.holderLabel?.value ?? holderQid,
        coords: b.coords?.value ? parseWktCoords(b.coords.value) : undefined,
        country: b.countryLabel?.value,
        rel: (b.rel?.value as 'P276' | 'P195') ?? 'P276',
      };
      const list = out.get(item) ?? [];
      list.push(row);
      out.set(item, list);
    }
  }
  return out;
}

// ─── Q4: category (P31) labels ───────────────────────────────────────────────

async function fetchTypeLabels(typeQids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (typeQids.length === 0) return out;
  for (const part of chunk(typeQids, CHUNK)) {
    const values = part.map((q) => `wd:${q}`).join(' ');
    const query = `
      SELECT ?type ?typeLabel WHERE {
        VALUES ?type { ${values} }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,am". }
      }`;
    const bindings: Binding[] = await sparqlPost(query);
    for (const b of bindings) {
      const qid = qidFromUri(b.type.value);
      const label = b.typeLabel?.value;
      if (label && label !== qid) out.set(qid, label);
    }
  }
  return out;
}

/** Discover + project + assemble. Uncached; wrapped by getWikidataArtifacts. */
export async function fetchWikidataArtifacts(): Promise<ArtifactCard[]> {
  const qids = await discoverArtifactQIDs();
  if (qids.length === 0) return [];

  const [fieldsMap, holdersMap] = await Promise.all([
    fetchItemFields(qids),
    fetchHolders(qids),
  ]);

  // Resolve the distinct P31 QIDs' labels once (Q4), rather than per item.
  const typeQids = new Set<string>();
  for (const f of fieldsMap.values()) f.types.forEach((t) => typeQids.add(t));
  const typeLabels = await fetchTypeLabels([...typeQids]);

  return qids.map((qid) =>
    assembleCard(
      qid,
      fieldsMap.get(qid) ?? bindingToItemFields({ item: { value: qid, type: 'uri' } }),
      holdersMap.get(qid) ?? [],
      typeLabels,
    ),
  );
}

// ─── Caching (Vercel Data Cache) ─────────────────────────────────────────────
//
// Module-scoped caches don't survive serverless cold starts, so we lean on the
// Next.js Data Cache instead. One entry holds the whole ArtifactCard[]; at ~600
// lean cards this stays well under the ~2 MB per-entry limit. The cache is
// rebuilt every WD_REVALIDATE_SECONDS, or on demand via POST /api/revalidate
// (which calls revalidateTag(WD_ARTIFACTS_TAG)) after a minting batch.

export const WD_ARTIFACTS_TAG = 'wd-artifacts';
const WD_REVALIDATE_SECONDS = 3600;

const cachedFetch = unstable_cache(
  fetchWikidataArtifacts,
  ['wd-artifacts'],
  { revalidate: WD_REVALIDATE_SECONDS, tags: [WD_ARTIFACTS_TAG] },
);

/** Entry point for the read path — cached, rebuilt from Wikidata on revalidate. */
export async function getWikidataArtifacts(): Promise<ArtifactCard[]> {
  return cachedFetch();
}
