// Server-only — joins the artifacts CSV, the tag/category mappings, and the
// dedup result into one fully-resolved ArtifactCard[] for the review map.
import { loadArtifactsCsv, type CsvArtifact } from './utils/loadArtifactsCsv';
import { loadTagsCsv, normalizeName } from './utils/loadTagsCsv';
import { loadCategoriesTsv } from './utils/loadCategoriesTsv';
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
 * Substring match against the hand-curated INSTITUTION_COORDS table.
 * For the MVP this is good enough; a future step swaps in SPARQL P625
 * resolution by holder QID for better coverage.
 */
function lookupCoords(name: string): [number, number] {
  const lower = name.toLowerCase();
  for (const [key, coords] of Object.entries(INSTITUTION_COORDS)) {
    const k = key.toLowerCase();
    if (lower.includes(k) || k.includes(lower)) return coords;
  }
  return DEFAULT_COORDS;
}

function buildHolder(rawName: string, tagsByName: Map<string, TagEntry>): ResolvedHolder {
  const entry = tagsByName.get(normalizeName(rawName));
  const name = entry?.name ?? rawName;
  const hasQid = !!entry?.qid && entry.source !== 'skip' && entry.source !== 'none';
  return {
    rawName,
    name,
    qid: hasQid ? entry!.qid : null,
    source: entry?.source ?? '',
    coords: lookupCoords(name),
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
  csv: CsvArtifact,
  tagsByName: Map<string, TagEntry>,
  catsByName: Map<string, CategoryEntry>,
  dedup: DedupResult,
): ArtifactCard {
  const rawTagNames = splitPipe(csv.tag_names);
  const rawCatNames = splitPipe(csv.category_names);

  const allHolders = rawTagNames.map(n => buildHolder(n, tagsByName));
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
    slug: csv.slug,
    url: csv.url,
    title: stripWeakMarker(csv.title),
    weakLink: csv.weak_link === 'yes' || /\*\s*$/.test(csv.title),
    what:  csv.what  || undefined,
    where: csv.where || undefined,
    imageUrls:   splitPipe(csv.image_urls),
    sourceLinks: splitPipe(csv.source_links),
    datePublished: csv.date_published || undefined,
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
  /** Override the artifacts CSV path. */
  artifactsFile?: string;
  /** Override the tags CSV path (default: verified Airtable export). */
  tagsFile?: string;
  /** Override the categories TSV path (default: filled file from fill_qids.py). */
  categoriesFile?: string;
  /** Drop the "Features"/"News"/etc. site-organization posts. Default true. */
  filterUnreviewable?: boolean;
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
  const { filterUnreviewable = true } = opts;

  const [artifacts, tagsByName, catsByName] = await Promise.all([
    loadArtifactsCsv(opts.artifactsFile),
    loadTagsCsv(opts.tagsFile),
    loadCategoriesTsv(opts.categoriesFile),
  ]);

  const dedupMap = await batchCheckArtifacts(
    artifacts.map(a => ({ url: a.url, title: stripWeakMarker(a.title) })),
  );

  const cards = artifacts.map(a =>
    buildCard(
      a,
      tagsByName,
      catsByName,
      dedupMap.get(a.url) ?? { exists: false, qid: null, method: 'none', confidence: 0 },
    ),
  );

  return filterUnreviewable ? cards.filter(c => c.isReviewable) : cards;
}
