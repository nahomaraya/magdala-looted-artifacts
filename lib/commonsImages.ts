// Server-only — free-licensed 1868 photographs for the front-page collage.
//
// Lists the files directly inside the hero Commons categories (no
// subcategories) with their licence + author metadata. Only public-domain,
// CC0 and CC BY(-SA) files are kept, so every image shown can carry a credit
// line. A Commons outage never breaks the page: a failed category is logged
// and contributes nothing.
import { unstable_cache } from 'next/cache';
import { COMMONS_API, USER_AGENT } from './constants';

export const HERO_CATEGORIES = ['Battle of Magdala', 'British Expedition to Abyssinia'] as const;

/** A hanging Commons request must not hold up `/` on a cold cache. */
const FETCH_TIMEOUT_MS = 8000;

export interface CommonsImage {
  /** Commons file title, e.g. "File:Fortress of Magdala.jpg". */
  title: string;
  /** 480px-wide thumbnail. */
  thumbUrl: string;
  /** The file's Commons description page (credit-line link target). */
  pageUrl: string;
  artist: string;
  /** Short licence name, e.g. "Public domain" or "CC BY-SA 4.0". */
  license: string;
  category: string;
}

// After CC BY(-SA) the lookahead replaces `\b`, which would also admit the
// non-free-culture variants CC BY-NC and CC BY-ND.
const FREE_LICENSE = /^(public domain|pd\b|cc0|cc by(-sa)?(?![-\w]))/i;

interface ExtValue {
  value?: unknown;
}

interface CommonsPage {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, ExtValue | undefined>;
  }[];
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

// An element styled display:none, with its content. Templates such as
// {{Unknown author}} repeat their text in a hidden span; nested elements of
// the same tag inside a hidden one are not expected.
const HIDDEN_ELEMENT =
  /<(\w+)\b[^>]*\bstyle\s*=\s*(["'])[^"']*display\s*:\s*none[^"']*\2[^>]*>[\s\S]*?<\/\1\s*>/gi;

function decodeEntity(entity: string, body: string): string {
  if (body[0] === '#') {
    const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }
  return ENTITIES[body] ?? entity;
}

/** Commons returns the artist as an HTML fragment; reduce it to plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(HIDDEN_ELEMENT, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, decodeEntity)
    .replace(/\s+/g, ' ')
    .trim();
}

function metaText(meta: Record<string, ExtValue | undefined> | undefined, key: string): string {
  const v = meta?.[key]?.value;
  return typeof v === 'string' ? v : '';
}

/** Keep the free-licensed files of one categorymembers/imageinfo response. */
export function parseCommonsFiles(json: unknown, category: string): CommonsImage[] {
  const pages = (json as { query?: { pages?: Record<string, CommonsPage> } } | null)?.query?.pages;
  if (!pages || typeof pages !== 'object') return [];

  const out: CommonsImage[] = [];
  for (const page of Object.values(pages)) {
    const info = page?.imageinfo?.[0];
    if (!page.title || !info?.thumburl || !info.descriptionurl) continue;

    const license = htmlToText(metaText(info.extmetadata, 'LicenseShortName'));
    if (!FREE_LICENSE.test(license)) continue;

    out.push({
      title: page.title,
      thumbUrl: info.thumburl,
      pageUrl: info.descriptionurl,
      artist: htmlToText(metaText(info.extmetadata, 'Artist')) || 'Unknown',
      license,
      category,
    });
  }
  return out;
}

async function fetchCategory(category: string): Promise<CommonsImage[]> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'categorymembers',
    gcmtitle: `Category:${category}`,
    gcmtype: 'file',
    gcmlimit: '200',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '480',
    format: 'json',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Commons responded ${res.status}`);
  return parseCommonsFiles(await res.json(), category);
}

/**
 * Throws when ANY category fails, so unstable_cache never stores a partial
 * list (and a stale entry survives a failed revalidation).
 */
async function fetchHeroImages(): Promise<CommonsImage[]> {
  const settled = await Promise.allSettled(HERO_CATEGORIES.map(fetchCategory));
  const failed = settled.flatMap((r, i) =>
    r.status === 'rejected' ? [{ category: HERO_CATEGORIES[i], reason: r.reason }] : [],
  );
  if (failed.length > 0) {
    for (const { category, reason } of failed) {
      console.error(`Commons category "${category}" failed:`, reason);
    }
    throw new Error(`Commons hero images unavailable: ${failed.map((f) => f.category).join(', ')}`);
  }

  const seen = new Set<string>();
  const out: CommonsImage[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const image of result.value) {
      if (seen.has(image.title)) continue;
      seen.add(image.title);
      out.push(image);
    }
  }
  return out;
}

// Cached in the Next.js Data Cache like getWikidataArtifacts; the photographs
// rarely change, so a day is plenty.
export const COMMONS_HERO_TAG = 'commons-hero';
const COMMONS_REVALIDATE_SECONDS = 86400;

const cachedFetch = unstable_cache(fetchHeroImages, ['commons-hero'], {
  revalidate: COMMONS_REVALIDATE_SECONDS,
  tags: [COMMONS_HERO_TAG],
});

/**
 * Free-licensed hero photographs from the Commons hero categories — cached.
 * Never throws: a Commons failure yields [] so the front page still renders.
 */
export async function getHeroImages(): Promise<CommonsImage[]> {
  try {
    return await cachedFetch();
  } catch {
    return []; // already logged per category in fetchHeroImages
  }
}

// ── Credits for featured artifact images ───────────────────────────────────

const FILE_PATH_MARKER = '/Special:FilePath/';

/**
 * Wikidata P18 values are Special:FilePath URLs; this returns the Commons
 * file title they point at ("File:Foo bar.jpg"), or null for any other URL.
 */
export function fileTitleFromFilePath(url: string): string | null {
  const at = url.indexOf(FILE_PATH_MARKER);
  if (at < 0) return null;
  let name: string;
  try {
    name = decodeURIComponent(url.slice(at + FILE_PATH_MARKER.length)).replace(/_/g, ' ').trim();
  } catch {
    return null; // malformed percent-encoding
  }
  return name ? `File:${name}` : null;
}

/** A file's Commons description page, for when its credit is unknown. */
export function commonsFilePageUrl(title: string): string {
  const name = title.replace(/^File:/, '').replace(/ /g, '_');
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name)}`;
}

/** Commons allows at most 50 titles per query. */
const TITLES_PER_QUERY = 50;

/**
 * Credits keyed by requested title. Throws on any failed request so
 * unstable_cache never stores a partial result. Returns entries, not a Map:
 * the Data Cache stores JSON.
 */
async function fetchFileCredits(titles: string[]): Promise<[string, CommonsImage][]> {
  const out: [string, CommonsImage][] = [];
  for (let i = 0; i < titles.length; i += TITLES_PER_QUERY) {
    const batch = titles.slice(i, i + TITLES_PER_QUERY);
    const params = new URLSearchParams({
      action: 'query',
      titles: batch.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '480',
      format: 'json',
    });
    const res = await fetch(`${COMMONS_API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Commons responded ${res.status}`);
    const json = await res.json();

    // Not from a hero category, so no category.
    const byTitle = new Map(parseCommonsFiles(json, '').map((img) => [img.title, img]));
    const normalized = new Map<string, string>(
      ((json as { query?: { normalized?: { from: string; to: string }[] } })?.query?.normalized ?? []).map(
        (n) => [n.from, n.to],
      ),
    );
    for (const title of batch) {
      const image = byTitle.get(normalized.get(title) ?? title);
      if (image) out.push([title, image]);
    }
  }
  return out;
}

const cachedFileCredits = unstable_cache(fetchFileCredits, ['commons-file-credits'], {
  revalidate: COMMONS_REVALIDATE_SECONDS,
  tags: [COMMONS_HERO_TAG],
});

/**
 * Author + licence for the given Commons files (e.g. featured artifact
 * images), keyed by the title as given — cached. Files that aren't
 * free-licensed are absent. Never throws: a Commons failure yields an empty Map.
 */
export async function getFileCredits(titles: string[]): Promise<Map<string, CommonsImage>> {
  const unique = [...new Set(titles)].sort();
  if (unique.length === 0) return new Map();
  try {
    return new Map(await cachedFileCredits(unique));
  } catch (err) {
    console.error('Commons file credits unavailable:', err);
    return new Map();
  }
}
