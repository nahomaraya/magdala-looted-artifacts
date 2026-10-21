import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { HERO_CATEGORIES, getHeroImages, parseCommonsFiles } from '@/lib/commonsImages';
import { USER_AGENT } from '@/lib/constants';

/** One imageinfo page, shaped like Commons' generator=categorymembers response. */
function page(
  title: string,
  meta: Record<string, string | undefined>,
  opts: { imageinfo?: boolean } = {},
) {
  const extmetadata = Object.fromEntries(
    Object.entries(meta)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, { value: v, source: 'commons-desc-page', hidden: '' }]),
  );
  const slug = title.replace(/^File:/, '').replace(/ /g, '_');
  return {
    pageid: Math.abs(title.length * 7919),
    ns: 6,
    title,
    imagerepository: 'local',
    ...(opts.imageinfo === false
      ? {}
      : {
          imageinfo: [
            {
              thumburl: `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/${slug}/500px-${slug}`,
              thumbwidth: 480,
              thumbheight: 320,
              url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${slug}`,
              descriptionurl: `https://commons.wikimedia.org/wiki/File:${slug}`,
              descriptionshorturl: 'https://commons.wikimedia.org/w/index.php?curid=1',
              extmetadata,
            },
          ],
        }),
  };
}

function response(...pages: ReturnType<typeof page>[]) {
  return {
    batchcomplete: '',
    query: { pages: Object.fromEntries(pages.map((p, i) => [String(1000 + i), p])) },
  };
}

const fixture = response(
  page('File:Fortress of Magdala.jpg', {
    LicenseShortName: 'Public domain',
    Artist: '<div class="fn value">\nHenry Aaron Stern</div>',
  }),
  page('File:Roger Fenton.jpg', {
    LicenseShortName: 'CC BY-SA 4.0',
    Artist: '<a href="//commons.wikimedia.org/wiki/User:Example">Example &amp; Co</a>',
  }),
  page('File:Anonymous plate.jpg', { LicenseShortName: 'CC0', Artist: '' }),
  page('File:Restricted.jpg', { LicenseShortName: 'All rights reserved', Artist: 'Someone' }),
  page('File:No licence.jpg', { Artist: 'Someone' }),
  page('File:Non commercial.jpg', { LicenseShortName: 'CC BY-NC 4.0', Artist: 'Someone' }),
  page('File:No imageinfo.jpg', { LicenseShortName: 'Public domain' }, { imageinfo: false }),
);

describe('parseCommonsFiles', () => {
  const images = parseCommonsFiles(fixture, 'Battle of Magdala');
  const byTitle = (t: string) => images.find((i) => i.title === t);

  it('keeps public-domain, CC0 and CC BY(-SA) files only', () => {
    expect(images.map((i) => i.title).sort()).toEqual([
      'File:Anonymous plate.jpg',
      'File:Fortress of Magdala.jpg',
      'File:Roger Fenton.jpg',
    ]);
  });

  it('drops all-rights-reserved, non-commercial and unlicensed files', () => {
    expect(byTitle('File:Restricted.jpg')).toBeUndefined();
    expect(byTitle('File:Non commercial.jpg')).toBeUndefined();
    expect(byTitle('File:No licence.jpg')).toBeUndefined();
  });

  it('drops files with no imageinfo', () => {
    expect(byTitle('File:No imageinfo.jpg')).toBeUndefined();
  });

  it('maps the thumbnail, file description page, licence and category', () => {
    expect(byTitle('File:Fortress of Magdala.jpg')).toEqual({
      title: 'File:Fortress of Magdala.jpg',
      thumbUrl:
        'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Fortress_of_Magdala.jpg/500px-Fortress_of_Magdala.jpg',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Fortress_of_Magdala.jpg',
      artist: 'Henry Aaron Stern',
      license: 'Public domain',
      category: 'Battle of Magdala',
    });
  });

  it('strips HTML from the artist', () => {
    expect(byTitle('File:Roger Fenton.jpg')?.artist).toBe('Example & Co');
  });

  it("uses 'Unknown' for an empty artist", () => {
    expect(byTitle('File:Anonymous plate.jpg')?.artist).toBe('Unknown');
  });

  it('returns [] for an empty or malformed response', () => {
    expect(parseCommonsFiles({ batchcomplete: '' }, 'x')).toEqual([]);
    expect(parseCommonsFiles(null, 'x')).toEqual([]);
    expect(parseCommonsFiles('nope', 'x')).toEqual([]);
  });
});

describe('getHeroImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

  it('queries each hero category directly with the User-Agent', async () => {
    const fetchMock = vi.fn(async () => ok(response()));
    vi.stubGlobal('fetch', fetchMock);
    await getHeroImages();

    expect(fetchMock).toHaveBeenCalledTimes(HERO_CATEGORIES.length);
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const urls = calls.map(([u]) => new URL(u));
    expect(urls.map((u) => u.searchParams.get('gcmtitle'))).toEqual(
      HERO_CATEGORIES.map((c) => `Category:${c}`),
    );
    const first = urls[0].searchParams;
    expect(first.get('generator')).toBe('categorymembers');
    expect(first.get('gcmtype')).toBe('file');
    expect(first.get('gcmlimit')).toBe('200');
    expect(first.get('iiprop')).toBe('url|extmetadata');
    expect(first.get('iiurlwidth')).toBe('480');
    expect(calls[0][1].headers).toMatchObject({ 'User-Agent': USER_AGENT });
  });

  it("returns the other category's images when one category's fetch rejects", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (new URL(url).searchParams.get('gcmtitle') === `Category:${HERO_CATEGORIES[0]}`) {
          throw new Error('network down');
        }
        return ok(response(page('File:Expedition.jpg', { LicenseShortName: 'Public domain' })));
      }),
    );

    const images = await getHeroImages();
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      title: 'File:Expedition.jpg',
      category: HERO_CATEGORIES[1],
    });
  });

  it('treats a non-OK response as a failed category', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response),
    );
    await expect(getHeroImages()).resolves.toEqual([]);
  });

  it('dedupes a file listed in both categories by title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        ok(response(page('File:Shared.jpg', { LicenseShortName: 'Public domain' }))),
      ),
    );
    const images = await getHeroImages();
    expect(images).toHaveLength(1);
    expect(images[0].category).toBe(HERO_CATEGORIES[0]);
  });
});
