import { NextResponse } from 'next/server';
import { getArtifact } from '@/lib/wikidata';
import {getReviewArtifacts} from '@/lib/getReviewArtifacts'

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qid: string }> },
) {
  const { qid } = await params;

  if (!/^Q\d+$/.test(qid)) {
    return NextResponse.json({ error: 'Invalid QID format' }, { status: 400 });
  }

  try {
    const artifact = await getArtifact(qid);
    console.log(getReviewArtifacts);
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }
    return NextResponse.json(artifact);
  } catch (error) {
    console.error(`GET /api/artifacts/${qid} failed:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch artifact', details: String(error) },
      { status: 500 },
    );
  }
}
