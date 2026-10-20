import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type ReviewPageProps = {
  searchParams?: Promise<{ wpId?: string | string[] }>;
};

// /review became /map; old `?wpId=` links carry over for /map to resolve.
export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const { wpId } = (await searchParams) ?? {};
  const legacyId = Array.isArray(wpId) ? wpId[0] : wpId;
  redirect(legacyId ? `/map?wpId=${encodeURIComponent(legacyId)}` : '/map');
}
