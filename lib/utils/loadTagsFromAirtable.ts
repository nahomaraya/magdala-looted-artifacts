// Server-only. Loads the Wikidata Tags table from Airtable. Matches the
// shape of loadTagsCsv — a Map<normalizedName, TagEntry>.
import { fetchAllRecords, TABLE_IDS } from '../airtable';
import { normalizeName } from './loadTagsCsv';
import type { TagEntry, QidSource } from '../types';

/** Note: the primary field is " wp_id" with a leading space in the schema. */
interface AirtableTagFields {
  ' wp_id'?: number;
  wp_id?: number;
  qid?: string;
  'qid copy'?: string;
  'Verification Status'?: string;
  name?: string;
  count?: number;
  source?: string;
  match_label?: string;
  match_desc?: string;
  alt1?: string;
  alt2?: string;
}

export async function loadTagsFromAirtable(): Promise<Map<string, TagEntry>> {
  const records = await fetchAllRecords<AirtableTagFields>(TABLE_IDS.tags);
  const byName = new Map<string, TagEntry>();

  for (const r of records) {
    const f = r.fields;
    const name = f.name ?? '';
    if (!name) continue;
    const wpId = f[' wp_id'] ?? f.wp_id;
    byName.set(normalizeName(name), {
      wpId: wpId != null ? String(wpId) : '',
      name,
      qid: (f.qid ?? '').trim(),
      source: (f.source ?? '') as QidSource,
      count: Number(f.count ?? 0),
      verificationStatus: f['Verification Status'] || undefined,
      notes: f.match_label || f.match_desc || undefined,
    });
  }
  return byName;
}
