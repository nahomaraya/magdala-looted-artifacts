// Server-only — joins the artifacts CSV, the tag/category mappings, and the
// dedup result into one fully-resolved ArtifactCard[] for the review map.
import { type CsvArtifact } from './utils/loadArtifactsCsv';
import { loadArtifactsFromAirtable, type AirtableArtifact } from './utils/loadArtifactsFromAirtable';
import { normalizeName } from './utils/loadTagsCsv';
import { loadTagsFromAirtable } from './utils/loadTagsFromAirtable';
import { loadCategoriesFromAirtable } from './utils/loadCategoriesFromAirtable';
import { loadMuseumsFromAirtable } from './utils/loadMuseumsFromAirtable';
import { type MuseumEntry } from './utils/loadMuseumsCsv';
import { batchCheckArtifacts, type DedupResult } from './dedup';
import { INSTITUTION_COORDS, DEFAULT_COORDS } from './constants';
import type {
  ArtifactCard,
  ResolvedHolder,
  ResolvedCategory,
  MaqdalaConfidence,
  TagEntry,
  CategoryEntry,
} from './types';

/**
 * Confidence-indicator categories from the source site - these are NOT
 * artifact types; they're qualifiers on the looting-event statement.
 */
const MAQDALA_CONFIDENCE_MAP: Record<string, MaqdalaConfidence> = {
  'strong link to maqdala':    'strong',
  'clear link to maqdala':     'clear',
  'possible link to maqdala':  'possible',
  'suspected magdala plunder': 'suspected',
};

/** Pipe-separated string with leading/trailing spaces around each token. */
function splitPipe(s: string | undefined): string[] {
  if (!s) return [];
  return s.split('|').map(v => v.trim()).filter(Boolean);
}

/** Strip the title's trailing-* weak-link marker. */
function stripWeakMarker(title: string): string {
  return title.replace(/\s*\*+\s*$/, '').trim();
}

/**
 * Resolve a holder name to coordinates. Priority:
 *   1. Museums CSV (`coordiniates` field) — authoritative, hand-set per holder
 *   2. Substring match against INSTITUTION_COORDS — legacy fallback
 *   3. DEFAULT_COORDS — last resort
 */
function lookupCoords(
  name: string,
  museumsByName: Map<string, MuseumEntry>,
): [number, number] {
  const fromMuseum = museumsByName.get(normalizeName(name))?.coords;
  if (fromMuseum) return fromMuseum;

  const lower = name.toLowerCase();
  for (const [key, coords] of Object.entries(INSTITUTION_COORDS)) {
    const k = key.toLowerCase();
    if (lower.includes(k) || k.includes(lower)) return coords;
  }
  return DEFAULT_COORDS;
}

function buildHolder(
  rawName: string,
  tagsByName: Map<string, TagEntry>,
  museumsByName: Map<string, MuseumEntry>,
): ResolvedHolder {
  const entry = tagsByName.get(normalizeName(rawName));
  const name = entry?.name ?? rawName;
  const hasQid = !!entry?.qid && entry.source !== 'skip' && entry.source !== 'none';
  return {
    rawName,
    name,
    qid: hasQid ? entry!.qid : null,
    source: entry?.source ?? '',
    coords: lookupCoords(name, museumsByName),
    verificationStatus: entry?.verificationStatus,
  };
}

function buildCategory(
  rawName: string,
  catsByName: Map<string, CategoryEntry>,
): ResolvedCategory {
  const entry = catsByName.get(normalizeName(rawName));
  const source = entry?.source ?? '';
  return {
    rawName,
    name: entry?.name ?? rawName,
    qid: entry?.qid ? entry.qid : null,
    source,
    notes: entry?.notes,
    isCompound:  source === 'compound',
    isQualifier: source === 'qualifier',
    isSkip:      source === 'skip',
  };
}

function detectMaqdalaConfidence(rawNames: string[]): MaqdalaConfidence | null {
  for (const n of rawNames) {
    const key = normalizeName(n);
    if (key in MAQDALA_CONFIDENCE_MAP) return MAQDALA_CONFIDENCE_MAP[key];
  }
  return null;
}

function buildCard(
  csv: CsvArtifact | AirtableArtifact,
  tagsByName: Map<string, TagEntry>,
  catsByName: Map<string, CategoryEntry>,
  museumsByName: Map<string, MuseumEntry>,
  dedup: DedupResult,
): ArtifactCard {
  // Airtable-only extras when present
  const air = csv as Partial<AirtableArtifact>;
  const rawTagNames = splitPipe(csv.tag_names);
  const rawCatNames = splitPipe(csv.category_names);

  const allHolders = rawTagNames.map(n => buildHolder(n, tagsByName, museumsByName));
  const holder = allHolders.find(h => h.qid !== null) ?? null;

  const allCategories = rawCatNames.map(n => buildCategory(n, catsByName));
  const primaryCategory = allCategories.find(
    c => c.qid !== null && !c.isQualifier && !c.isSkip,
  ) ?? null;

  // An artifact is reviewable as long as at least one category resolves to
  // something other than skip. Posts with only "Features"/"News"/etc. drop out.
  const isReviewable =
    allCategories.length > 0 && allCategories.some(c => !c.isSkip);

  return {
    wpId: csv.wp_id,
    airtableId: air.airtableId,
    slug: csv.slug,
    url: csv.url,
    title: stripWeakMarker(csv.title),
    weakLink: csv.weak_link === 'yes' || /\*\s*$/.test(csv.title),
    what:  csv.what  || undefined,
    where: csv.where || undefined,
    imageUrls:   splitPipe(csv.image_urls),
    sourceLinks: splitPipe(csv.source_links),
    datePublished: csv.date_published || undefined,
    returned:     air.returned,
    returnedDate: air.returnedDate,
    holder,
    allHolders,
    primaryCategory,
    allCategories,
    maqdalaConfidence: detectMaqdalaConfidence(rawCatNames),
    isReviewable,
    dedup: {
      exists: dedup.exists,
      qid: dedup.qid,
      method: dedup.method,
      confidence: dedup.confidence,
      matchedLabel: dedup.matchedLabel,
      matchedDesc: dedup.matchedDesc,
    },
  };
}

export interface GetReviewArtifactsOptions {
  /** Drop the "Features"/"News"/etc. site-organization posts. Default true. */
  filterUnreviewable?: boolean;
  /**
   * Skip the SPARQL dedup queries entirely. Useful while you're not yet
   * minting items - every card comes back with method='none' and the page
   * doesn't touch WDQS. Default false.
   */
  skipDedup?: boolean;
}

/**
 * Entry point for the review map. One server-side call returns every
 * artifact with its resolved holder, category, Maqdala confidence, and
 * dedup status.
 *
 * Two SPARQL round-trips total (one batched P973, one survey), one CSV
 * read, two TSV/CSV reads — all cached in-process.
 */
export async function getReviewArtifacts(
  opts: GetReviewArtifactsOptions = {},
): Promise<ArtifactCard[]> {
  const { filterUnreviewable = true, skipDedup = false } = opts;

  const [artifacts, tagsByName, catsByName, museumsByName] = await Promise.all([
    loadArtifactsFromAirtable(),
    loadTagsFromAirtable(),
    loadCategoriesFromAirtable(),
    loadMuseumsFromAirtable(),
  ]);

  // WDQS can rate-limit or be transiently down. We'd rather render the
  // map with every artifact marked "unknown dedup" than crash the page,
  // so swallow SPARQL failures and proceed. When skipDedup is true we
  // don't touch WDQS at all.
  let dedupMap: Map<string, DedupResult>;
  if (skipDedup) {
    dedupMap = new Map();
  } else {
    try {
      dedupMap = await batchCheckArtifacts(
        artifacts.map(a => ({ url: a.url, title: stripWeakMarker(a.title) })),
      );
    } catch (err) {
      console.error('[getReviewArtifacts] dedup unavailable, rendering without it:', err);
      dedupMap = new Map();
    }
  }

  const cards = artifacts.map(a => {
    // Prefer a manually-set Airtable qid over the SPARQL dedup result so
    // the UI always treats the artifact as "on Wikidata" once the user has
    // pasted a Q-id into the row. Falls back to dedup output otherwise.
    const airQid = (a as Partial<AirtableArtifact>).qid;
    const base = dedupMap.get(a.url) ?? { exists: false, qid: null, method: 'none' as const, confidence: 0 };
    const merged: DedupResult = airQid
      ? { exists: true, qid: airQid, method: 'p973', confidence: 100 }
      : base;
    return buildCard(a, tagsByName, catsByName, museumsByName, merged);
  });

  return filterUnreviewable ? cards.filter(c => c.isReviewable) : cards;
}
