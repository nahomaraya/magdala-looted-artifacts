/**
 * POST /api/artifacts/returned
 *
 * Records that an artifact has been returned to Ethiopia. Body:
 *   {
 *     wpId: string | number,   // required - WordPress post id
 *     qid?: string,            // Wikidata Q-id, logged only
 *     returnedOn?: string,     // YYYY-MM-DD; defaults to today
 *     airtableId?: string,     // Airtable record id; skips the wp_id lookup
 *   }
 *
 * Writes back to Airtable's Artifacts table:
 *   { Returned: true, "Returned date": <returnedOn> }
 *
 * Both fields must exist on the table (`Returned` checkbox, `Returned date`
 * date) — add them in Airtable if they're not there yet.
 *
 * Lives at a static path rather than `app/api/artifacts/[wpId]/returned`
 * because the sibling `[qid]` route would conflict with it (Next.js
 * doesn't allow two different dynamic-segment names at the same parent).
 */
import { updateRecord, findOneByFormula, TABLE_IDS } from '@/lib/airtable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  wpId?: string | number;
  qid?: string;
  returnedOn?: string;
  airtableId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as Body;
  const wpId = body.wpId != null ? String(body.wpId) : null;

  if (!wpId && !body.airtableId) {
    return Response.json(
      { ok: false, reason: 'wpId or airtableId required' },
      { status: 400 },
    );
  }

  const returnedOn = body.returnedOn ?? new Date().toISOString().slice(0, 10);

  try {
    let airtableId = body.airtableId;
    if (!airtableId) {
      const found = await findOneByFormula(
        TABLE_IDS.artifacts,
        `{wp_id} = ${Number(wpId)}`,
      );
      if (!found) {
        return Response.json(
          { ok: false, reason: 'artifact not found in Airtable', wpId },
          { status: 404 },
        );
      }
      airtableId = found.id;
    }

    await updateRecord(TABLE_IDS.artifacts, airtableId, {
      Returned: true,
      'Returned date': returnedOn,
    });

    return Response.json({
      ok: true,
      wpId,
      airtableId,
      returnedOn,
      qid: body.qid ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mark-returned] failed:', message);
    return Response.json({ ok: false, error: message, wpId }, { status: 500 });
  }
}
