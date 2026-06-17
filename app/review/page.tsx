import { getArtifacts } from '@/lib/artifactSource';
import type { ArtifactCard } from '@/lib/types';
import ReviewMap, { type ReviewWikidataHit } from '@/components/ReviewMap/index';

export const dynamic = 'force-dynamic';

type ReviewPageProps = {
  // Next.js 15+ delivers searchParams as a Promise that must be awaited.
  searchParams?: Promise<{
    wpId?: string;
  }>;
};

/**
 * Wikidata hits keyed by QID, built straight from the cards. When the source
 * is Wikidata every card already carries its label and image, so there's no
 * need for per-item REST/Commons lookups — that N+1 pattern is exactly what
 * this refactor removes.
 */
function buildWikidataHitMap(
  artifacts: ArtifactCard[],
): Record<string, ReviewWikidataHit> {
  const hits: Record<string, ReviewWikidataHit> = {};
  for (const a of artifacts) {
    const qid = a.dedup.method === 'p973' ? a.dedup.qid : null;
    if (!qid || hits[qid]) continue;
    hits[qid] = {
      qid,
      label: a.title,
      imageUrl: a.imageUrls[0],
      wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
    };
  }
  return hits;
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { wpId } = (await searchParams) ?? {};
  // Source is chosen by ARTIFACT_SOURCE (default 'airtable'). skipDedup is a
  // no-op for the Wikidata path; it only affects the Airtable loader.
  const artifacts = await getArtifacts({ skipDedup: true });
  const wikidataHits = buildWikidataHitMap(artifacts);
  return (
    <ReviewMap
      artifacts={artifacts}
      wikidataHits={wikidataHits}
      initialSelectedWpId={wpId ?? null}
    />
  );
}
