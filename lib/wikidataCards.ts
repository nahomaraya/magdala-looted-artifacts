// Pure assembly of ArtifactCards from projected Wikidata fields — no network
// and no `next/*` imports, so it can be unit-tested. The SPARQL round-trips
// live in lib/getWikidataArtifacts.ts.
import {
  LOOTED_ART_QID,
  DISPUTED_CLAIM_QID,
  INSTITUTION_COORDS,
  DEFAULT_COORDS,
} from './constants';
import { qidFromUri, type Binding } from './utils/sparql';
import type { ArtifactCard, ResolvedHolder, ResolvedCategory } from './types';

function splitConcat(value: string | undefined): string[] {
  return (value ?? '').split('|').map((v) => v.trim()).filter(Boolean);
}

// ─── Q2 projection ───────────────────────────────────────────────────────────

export interface ItemFields {
  label?: string;
  description?: string;
  url?: string;
  types: string[];        // P31 QIDs (Q851304 filtered out)
  imageUrls: string[];    // Special:FilePath URLs, used directly
  weakLink: boolean;      // pq:P5102 == disputed
  references: string[];   // pr:P854 reference URLs on the P793 looting statement
  returnDates: string[];  // pq:P585 on the return-event P793 statement(s), ISO datetimes
  hasReturnEvent: boolean; // item carries a P793 = return event statement
}

export function bindingToItemFields(b: Binding): ItemFields {
  const label = b.itemLabel?.value;
  const types = splitConcat(b.types?.value)
    .map(qidFromUri)
    .filter((q) => q !== LOOTED_ART_QID);
  const confidences = splitConcat(b.confidences?.value).map(qidFromUri);
  return {
    label: label && label !== qidFromUri(b.item.value) ? label : undefined,
    description: b.itemDescription?.value || undefined,
    url: b.article?.value || undefined,
    types,
    imageUrls: splitConcat(b.images?.value),
    weakLink: confidences.includes(DISPUTED_CLAIM_QID),
    references: splitConcat(b.refs?.value),
    returnDates: splitConcat(b.returnDates?.value),
    hasReturnEvent: splitConcat(b.returns?.value).length > 0,
  };
}

// ─── Q3 projection ───────────────────────────────────────────────────────────

export interface HolderRow {
  qid: string;
  label: string;
  coords?: [number, number];
  country?: string;       // P17 label of the holder, when stated
  rel: 'P276' | 'P195';
}

// ─── Assembly ────────────────────────────────────────────────────────────────

/** Last non-empty path segment of the post URL, used as the card slug. */
export function slugFromUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    return path.split('/').pop() ?? '';
  } catch {
    return '';
  }
}

/** Holder coords: prefer the item's own P625; else a known institution; else default. */
export function holderCoords(row: HolderRow): [number, number] {
  if (row.coords) return row.coords;
  const lower = row.label.toLowerCase();
  for (const [key, coords] of Object.entries(INSTITUTION_COORDS)) {
    const k = key.toLowerCase();
    if (lower.includes(k) || k.includes(lower)) return coords;
  }
  return DEFAULT_COORDS;
}

export function buildHolders(rows: HolderRow[]): ResolvedHolder[] {
  // P276 (current location) before P195 (collection), then dedupe by QID so a
  // holder appearing under both relations collapses to one pin/rail entry.
  const ordered = [...rows].sort((a, b) => (a.rel === 'P276' ? 0 : 1) - (b.rel === 'P276' ? 0 : 1));
  const seen = new Set<string>();
  const holders: ResolvedHolder[] = [];
  for (const row of ordered) {
    if (seen.has(row.qid)) continue;
    seen.add(row.qid);
    holders.push({
      rawName: row.label,
      name: row.label,
      qid: row.qid,
      source: 'wikidata',
      coords: holderCoords(row),
      country: row.country,
    });
  }
  return holders;
}

/** Generic "looted art" / "looted property" P31 values say nothing about the object. */
const GENERIC_LOOTED_LABEL = /^looted (art|property)$/i;

export function buildCategories(types: string[], labels: Map<string, string>): ResolvedCategory[] {
  return types
    .map((qid) => ({ qid, name: labels.get(qid) ?? qid }))
    .filter(({ name }) => !GENERIC_LOOTED_LABEL.test(name))
    .map(({ qid, name }) => ({
      rawName: name,
      name,
      qid,
      source: 'wikidata' as const,
      isCompound: false,
      isQualifier: false,
      isSkip: false,
    }));
}

/** Latest of the ISO datetimes, as YYYY-MM-DD; undefined when there are none. */
function latestDate(dates: string[]): string | undefined {
  if (dates.length === 0) return undefined;
  return [...dates].sort().at(-1)!.slice(0, 10);
}

export function assembleCard(
  qid: string,
  f: ItemFields,
  holderRows: HolderRow[],
  typeLabels: Map<string, string>,
): ArtifactCard {
  const allHolders = buildHolders(holderRows);
  const holder = allHolders[0] ?? null;
  const allCategories = buildCategories(f.types, typeLabels);
  const url = f.url ?? '';

  return {
    wpId: qid,
    slug: slugFromUrl(url),
    url,
    title: f.label ?? qid,
    weakLink: f.weakLink,
    what: f.description,
    where: holder?.name,
    imageUrls: f.imageUrls,
    // The iframe/source link uses the P854 reference(s) on the looting (P793)
    // statement — the actual collection/archive pages — falling back to the
    // P973 post URL only when an item carries no references yet.
    sourceLinks: f.references.length ? f.references : url ? [url] : [],
    // Returned = the item carries a return-event (P793) statement, not merely
    // "held in Addis Ababa".
    returned: f.hasReturnEvent,
    returnedDate: latestDate(f.returnDates),
    holder,
    allHolders,
    primaryCategory: allCategories[0] ?? null,
    allCategories,
  };
}
