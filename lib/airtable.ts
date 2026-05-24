// Server-only. Thin client over the Airtable REST API.
//
// Env vars expected:
//   AIRTABLE_API_KEY   - personal access token (PAT)
//   AIRTABLE_BASE_ID   - the base containing the looted-artifacts tables
// Optional table-id overrides (defaults come from tables.json in repo root):
//   AIRTABLE_ARTIFACTS_TABLE_ID
//   AIRTABLE_MUSEUMS_TABLE_ID
//   AIRTABLE_TAGS_TABLE_ID
//   AIRTABLE_CATEGORIES_TABLE_ID

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0/';

/** Table IDs as documented in `tables.json` at repo root, overridable via env. */
export const TABLE_IDS = {
  artifacts:  process.env.AIRTABLE_ARTIFACTS_TABLE_ID  ?? 'tblczQyPF0U4wBfSY',
  museums:    process.env.AIRTABLE_MUSEUMS_TABLE_ID    ?? 'tbl5Svzkc7cRIU7iD',
  tags:       process.env.AIRTABLE_TAGS_TABLE_ID       ?? 'tblhB4XV7joN5NgjL',
  categories: process.env.AIRTABLE_CATEGORIES_TABLE_ID ?? 'tbl84ZozHDzN85i5I',
} as const;

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  createdTime: string;
  fields: T;
}

/**
 * Pull the string out of an Airtable cell that might be either a bare
 * string OR an `aiText` object like `{ state, value, isStale }`. Use this
 * for any field whose schema type is `aiText`.
 */
export function aiTextValue(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const v = (raw as { value: unknown }).value;
    return typeof v === 'string' ? v : '';
  }
  return '';
}

interface ListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

function requireConfig(): { apiKey: string; baseId: string } {
  const apiKey = process.env.AIRTABLE_API_KEY?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();
  const missing: string[] = [];
  if (!apiKey) missing.push('AIRTABLE_API_KEY');
  if (!baseId) missing.push('AIRTABLE_BASE_ID');
  if (missing.length) {
    throw new Error(
      `Airtable not configured. Missing env vars in .env.local: ${missing.join(', ')}. ` +
      `Did you restart the dev server after creating the file?`,
    );
  }
  if (!baseId!.startsWith('app')) {
    throw new Error(
      `AIRTABLE_BASE_ID looks wrong ("${baseId}"). Should start with "app" (e.g., appXXXXXXXXXXXXXX).`,
    );
  }
  return { apiKey: apiKey!, baseId: baseId! };
}

/** Wrap fetch so undici's bare "fetch failed" becomes diagnosable. */
async function airtableFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    const causeDetail = err instanceof Error && err.cause
      ? ` (cause: ${String(err.cause)})`
      : '';
    throw new Error(
      `Network failure calling Airtable at ${url}: ${cause}${causeDetail}. ` +
      `Common causes: no internet, corporate firewall blocking api.airtable.com, ` +
      `or a malformed URL (check AIRTABLE_BASE_ID and the table id).`,
    );
  }
}

interface FetchAllOptions {
  /** Next.js fetch revalidate seconds. Default 60. */
  revalidate?: number;
}

/**
 * Fetch every record from a table, following Airtable's pagination tokens.
 * Each page request is cached by Next.js for `revalidate` seconds, which
 * keeps repeated page renders cheap without persisting stale data forever.
 */
export async function fetchAllRecords<T = Record<string, unknown>>(
  tableIdOrName: string,
  opts: FetchAllOptions = {},
): Promise<AirtableRecord<T>[]> {
  const { apiKey, baseId } = requireConfig();
  const revalidate = opts.revalidate ?? 60;
  const all: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${baseId}/${encodeURIComponent(tableIdOrName)}`, AIRTABLE_API_BASE);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await airtableFetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      next: { revalidate },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Airtable ${res.status} on ${tableIdOrName}: ${body.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as ListResponse<T>;
    all.push(...data.records);
    offset = data.offset;
  } while (offset);

  return all;
}

/** PATCH a single record's fields. Throws on non-2xx. */
export async function updateRecord(
  tableIdOrName: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<AirtableRecord> {
  const { apiKey, baseId } = requireConfig();
  const url = new URL(
    `${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`,
    AIRTABLE_API_BASE,
  ).toString();

  const res = await airtableFetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Airtable PATCH ${res.status} on ${tableIdOrName}/${recordId}: ${body.slice(0, 200)}`,
    );
  }
  return (await res.json()) as AirtableRecord;
}

/** Look up a single record by formula (e.g., `{wp_id} = 6408`). */
export async function findOneByFormula<T = Record<string, unknown>>(
  tableIdOrName: string,
  filterByFormula: string,
): Promise<AirtableRecord<T> | null> {
  const { apiKey, baseId } = requireConfig();
  const url = new URL(`${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}`);
  url.searchParams.set('filterByFormula', filterByFormula);
  url.searchParams.set('maxRecords', '1');

  const res = await airtableFetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Airtable lookup ${res.status} on ${tableIdOrName}: ${body.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as ListResponse<T>;
  return data.records[0] ?? null;
}
