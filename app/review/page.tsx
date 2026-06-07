import { getReviewArtifacts } from '@/lib/getReviewArtifacts';
import { batchFetchBasicData } from '@/lib/utils/batchFetchBasicData';
import { resolveCommonsImage } from '@/lib/utils/resolveCommonsImage';
// import ReviewMap, { type ReviewWikidataHit } from '@/components/ReviewMap';
import ReviewMap, {type ReviewWikidataHit } from '@/components/ReviewMap/index';

export const dynamic = 'force-dynamic';

type ReviewPageProps = {
  // Next.js 15+ delivers searchParams as a Promise that must be awaited.
  searchParams?: Promise<{
    wpId?: string;
  }>;
};

async function buildWikidataHitMap(
  artifacts: Awaited<ReturnType<typeof getReviewArtifacts>>,
): Promise<Record<string, ReviewWikidataHit>> {
  const qids = Array.from(
    new Set(
      artifacts
        .filter((a) => a.dedup.method === 'p973' && a.dedup.qid)
        .map((a) => a.dedup.qid as string),
    ),
  );

  if (qids.length === 0) return {};

  const basicData = await batchFetchBasicData(qids);
  const entries = await Promise.all(
    qids.map(async (qid) => {
      const row = basicData.get(qid);
      const imageUrl = row?.imageFilename
        ? await resolveCommonsImage(row.imageFilename)
        : undefined;
      return [
        qid,
        {
          qid,
          label: row?.label ?? qid,
          imageUrl,
          wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
        },
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  // Dedup intentionally off while no items are being minted. Flip back on
  // (drop skipDedup, or set to false) once you start running QuickStatements.
  const { wpId } = (await searchParams) ?? {};
  const artifacts = await getReviewArtifacts({ skipDedup: true });
  const wikidataHits = await buildWikidataHitMap(artifacts);
  return (
    <ReviewMap
      artifacts={artifacts}
      wikidataHits={wikidataHits}
      initialSelectedWpId={wpId ?? null}
    />
  );
}
