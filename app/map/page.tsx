import { redirect } from 'next/navigation';
import { getWikidataArtifacts } from '@/lib/getWikidataArtifacts';
import { resolveLegacyWpId } from '@/lib/legacyLinks';
import legacyWpIds from '@/lib/legacyWpIds.json';
import StoryMap from '@/components/StoryMap/index';
import { mapHref, parseQid, parseView } from '@/components/StoryMap/views';

export const dynamic = 'force-dynamic';

type MapPageProps = {
  // Next.js 15+ delivers searchParams as a Promise that must be awaited.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const first = (raw: string | string[] | undefined) => (Array.isArray(raw) ? raw[0] : raw);

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = (await searchParams) ?? {};
  const view = parseView(first(params.view));
  const qid = parseQid(first(params.qid));
  const wpId = first(params.wpId);
  const artifacts = await getWikidataArtifacts();

  // An old `?wpId=` link: swap it for the artifact's QID, or drop it if nothing matches.
  if (wpId !== undefined && qid === null) {
    redirect(mapHref(view, resolveLegacyWpId(wpId, artifacts, legacyWpIds)));
  }

  return <StoryMap artifacts={artifacts} initialView={view} initialQid={qid} />;
}
