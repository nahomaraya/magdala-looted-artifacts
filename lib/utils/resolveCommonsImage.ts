import { COMMONS_API, USER_AGENT } from '../constants';

// ─── Image Resolution ──────────────────────────────────────────────────────
export async function resolveCommonsImage(filename: string): Promise<string | undefined> {
  const url = buildCommonsImageUrl(filename);

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return extractCommonsImageUrl(data);
  } catch {
    // ignore
  }
  return undefined;
}

function buildCommonsImageUrl(filename: string): URL {
  const url = new URL(COMMONS_API);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', `File:${filename}`);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  return url;
}

function extractCommonsImageUrl(data: unknown): string | undefined {
  const pages = (data as { query?: { pages?: Record<string, unknown> } } | undefined)?.query?.pages;
  if (!pages) return undefined;

  for (const page of Object.values(pages)) {
    const imgUrl = (page as { imageinfo?: { url: string }[] } | undefined)?.imageinfo?.[0]?.url;
    if (imgUrl) return imgUrl;
  }

  return undefined;
}
