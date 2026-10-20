import { getWikidataArtifacts } from '@/lib/getWikidataArtifacts';
import ReviewMap from '@/components/ReviewMap/index';

export const dynamic = 'force-dynamic';

type ReviewPageProps = {
  // Next.js 15+ delivers searchParams as a Promise that must be awaited.
  searchParams?: Promise<{
    wpId?: string;
  }>;
};

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { wpId } = (await searchParams) ?? {};
  const artifacts = await getWikidataArtifacts();
  return <ReviewMap artifacts={artifacts} initialSelectedWpId={wpId ?? null} />;
}
