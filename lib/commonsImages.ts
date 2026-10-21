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
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** Commons returns the artist as an HTML fragment; reduce it to plain text. */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
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
