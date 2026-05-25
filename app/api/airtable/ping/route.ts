/**
 * GET /api/airtable/ping
 *
 * Diagnostic endpoint - fetches the first page of each table and reports
 * how many records came back. Use this to verify .env.local is set and
 * the Airtable connection works, independently of the review page.
 */
import { fetchAllRecords, TABLE_IDS } from '@/lib/airtable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function probe(tableId: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    // revalidate=0 so the ping always hits Airtable, not a cached page
    const records = await fetchAllRecords(tableId, { revalidate: 0 });
    return { ok: true, count: records.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const env = {
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY
      ? `${process.env.AIRTABLE_API_KEY.slice(0, 6)}...${process.env.AIRTABLE_API_KEY.slice(-3)}`
      : 'MISSING',
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ?? 'MISSING',
  };

  const tables = {
    artifacts:  await probe(TABLE_IDS.artifacts),
    museums:    await probe(TABLE_IDS.museums),
    tags:       await probe(TABLE_IDS.tags),
    categories: await probe(TABLE_IDS.categories),
  };

  const ok = Object.values(tables).every(t => t.ok);
  return Response.json({ ok, env, tableIds: TABLE_IDS, tables }, { status: ok ? 200 : 500 });
}
