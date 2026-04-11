import { NextResponse } from 'next/server';
import { runSparql, discoverArtifactQIDs } from '@/lib/wikidata';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  try {
    if (query) {
      const results = await runSparql(query);
      return NextResponse.json({ results });
    }

    // Default: run the discovery queries and return raw results
    const discovery = await discoverArtifactQIDs();
    return NextResponse.json(discovery);
  } catch (error) {
    console.error('GET /api/sparql failed:', error);
    return NextResponse.json(
      { error: 'SPARQL query failed', details: String(error) },
      { status: 500 },
    );
  }
}
