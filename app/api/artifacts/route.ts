import { NextResponse } from 'next/server';
import { getAllArtifacts } from '@/lib/wikidata';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const artifacts = await getAllArtifacts();
    return NextResponse.json({ artifacts, count: artifacts.length });
  } catch (error) {
    console.error('GET /api/artifacts failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifacts', details: String(error) },
      { status: 500 },
    );
  }
}
