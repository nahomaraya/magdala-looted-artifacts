// On-demand cache rebuild for the Wikidata-sourced artifact list. Hit this
// after a QuickStatements minting batch to drop the cached payload so the next
// page load pulls fresh data from WDQS.
//
//   curl -X POST "$SITE/api/revalidate?secret=$REVALIDATE_SECRET"
//   curl -X POST "$SITE/api/revalidate" -H "x-revalidate-secret: $REVALIDATE_SECRET"
//
// Guarded by the REVALIDATE_SECRET env var; without it set, the route 503s so a
// misconfigured deploy can't be revalidated anonymously.
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { WD_ARTIFACTS_TAG } from '@/lib/getWikidataArtifacts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { revalidated: false, error: 'REVALIDATE_SECRET is not configured' },
      { status: 503 },
    );
  }

  const provided =
    req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-revalidate-secret');
  if (provided !== expected) {
    return NextResponse.json({ revalidated: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Next 16 requires a cache-life profile; 'max' purges the tagged entry on demand.
  revalidateTag(WD_ARTIFACTS_TAG, 'max');
  return NextResponse.json({ revalidated: true, tag: WD_ARTIFACTS_TAG, now: Date.now() });
}
