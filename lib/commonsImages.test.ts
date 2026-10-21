import { afterEach, describe, expect, it, vi } from 'vitest';

// Identity cache that records whether the inner function resolved or rejected:
// a rejection is what keeps unstable_cache from storing a result.
const cacheOutcomes = vi.hoisted(() => [] as ('resolved' | 'rejected')[]);

vi.mock('next/cache', () => ({
  unstable_cache:
    <T extends (...args: never[]) => Promise<unknown>>(fn: T) =>
    async (...args: Parameters<T>) => {
      try {
        const result = await fn(...args);
        cacheOutcomes.push('resolved');
        return result;
      } catch (err) {
        cacheOutcomes.push('rejected');
        throw err;
      }
    },
}));

import {
  HERO_CATEGORIES,
  commonsFilePageUrl,
  fileTitleFromFilePath,
  getFileCredits,
  getHeroImages,
  htmlToText,
  parseCommonsFiles,
} from '@/lib/commonsImages';
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

describe('htmlToText', () => {
  it('drops the hidden copy {{Unknown author}} emits', () => {
    expect(htmlToText('Unknown author<span style="display: none;">Unknown author</span>')).toBe(
      'Unknown author',
    );
    expect(htmlToText('A<span style="color:red;display:none">hidden</span>')).toBe('A');
  });

  it('replaces tags with a space', () => {
    expect(htmlToText('A<br>B')).toBe('A B');
  });

  it('decodes named and numeric entities', () => {
    expect(htmlToText('Smith &#38; Jones&#x27;s &amp; co')).toBe("Smith & Jones's & co");
  });
});

describe('getHeroImages', () => {
  afterEach(() => {
    cacheOutcomes.length = 0;
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

  // Deliberately not the other category's images: a partial list would be
  // cached for 24 h, so the cached function throws and getHeroImages returns [].
  it('returns [] and caches nothing when one category fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (new URL(url).searchParams.get('gcmtitle') === `Category:${HERO_CATEGORIES[0]}`) {
          throw new Error('network down');
        }
        return ok(response(page('File:Expedition.jpg', { LicenseShortName: 'Public domain' })));
      }),
    );

    await expect(getHeroImages()).resolves.toEqual([]);
    expect(cacheOutcomes).toEqual(['rejected']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('treats a non-OK response as a failed category', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response),
    );
    await expect(getHeroImages()).resolves.toEqual([]);
    expect(cacheOutcomes).toEqual(['rejected']);
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
    expect(cacheOutcomes).toEqual(['resolved']);
  });
});

describe('fileTitleFromFilePath', () => {
  it('turns a Special:FilePath URL into a File: title', () => {
    expect(
      fileTitleFromFilePath(
        'http://commons.wikimedia.org/wiki/Special:FilePath/Primo%20stile%20di%20gondar%2C%20kwer%27ata_re%27esu.jpg',
      ),
    ).toBe("File:Primo stile di gondar, kwer'ata re'esu.jpg");
  });

  it('returns null for a URL that is not a Special:FilePath URL or is malformed', () => {
    expect(fileTitleFromFilePath('https://example.com/a.jpg')).toBeNull();
    expect(fileTitleFromFilePath('http://commons.wikimedia.org/wiki/Special:FilePath/')).toBeNull();
    expect(fileTitleFromFilePath('http://commons.wikimedia.org/wiki/Special:FilePath/%E0%A4%A')).toBeNull();
  });
});

describe('commonsFilePageUrl', () => {
  it('links the file description page', () => {
    expect(commonsFilePageUrl("File:Kwer'ata re'esu?.jpg")).toBe(
      "https://commons.wikimedia.org/wiki/File:Kwer'ata_re'esu%3F.jpg",
    );
  });
});

describe('getFileCredits', () => {
  afterEach(() => {
    cacheOutcomes.length = 0;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

  it('fetches every title in one call and keys free-licensed files by requested title', async () => {
    const body = response(
      page('File:Free one.jpg', { LicenseShortName: 'CC BY 3.0', Artist: 'Sailko' }),
      page('File:Locked.jpg', { LicenseShortName: 'All rights reserved', Artist: 'Someone' }),
    );
    // Commons reports how it normalised a requested title.
    const normalized = [{ from: 'File:Free_one.jpg', to: 'File:Free one.jpg' }];
    const fetchMock = vi.fn(async () => ok({ ...body, query: { ...body.query, normalized } }));
    vi.stubGlobal('fetch', fetchMock);

    const credits = await getFileCredits(['File:Free_one.jpg', 'File:Locked.jpg']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock.mock.calls as unknown as [string, RequestInit][])[0];
    const params = new URL(url).searchParams;
    expect(params.get('titles')).toBe('File:Free_one.jpg|File:Locked.jpg');
    expect(params.get('prop')).toBe('imageinfo');
    expect(params.get('iiprop')).toBe('url|extmetadata');
    expect(params.get('iiurlwidth')).toBe('480');
    expect(init.headers).toMatchObject({ 'User-Agent': USER_AGENT });

    expect([...credits.keys()]).toEqual(['File:Free_one.jpg']);
    expect(credits.get('File:Free_one.jpg')).toMatchObject({
      title: 'File:Free one.jpg',
      artist: 'Sailko',
      license: 'CC BY 3.0',
      pageUrl: 'https://commons.wikimedia.org/wiki/File:Free_one.jpg',
    });
    expect(cacheOutcomes).toEqual(['resolved']);
  });

  it('returns an empty Map and caches nothing when Commons fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response),
    );
    const credits = await getFileCredits(['File:A.jpg']);
    expect(credits.size).toBe(0);
    expect(cacheOutcomes).toEqual(['rejected']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('makes no request for no titles', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await getFileCredits([])).size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
