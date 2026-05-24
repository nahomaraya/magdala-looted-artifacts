// Server-only. Loads the Wikidata Categories table from Airtable. Matches
// the shape of loadCategoriesTsv — Map<normalizedName, CategoryEntry>.
import { fetchAllRecords, aiTextValue, TABLE_IDS } from '../airtable';
import { normalizeName } from './loadTagsCsv';
import type { CategoryEntry, QidSource } from '../types';

interface AirtableCategoryFields {
  ' wp_id'?: number;
  wp_id?: number;
  name?: string;
  count?: number | string;
  qid?: string;
  /** AI-suggested QID column from the Airtable schema. Airtable returns
   *  aiText cells as { state, value, isStale }, not a bare string. */
  actual_qid?: string | { value?: string };
  source?: string;
  match_label?: string;
  match_desc?: string;
  alt1?: string;
  alt2?: string;
}

export async function loadCategoriesFromAirtable(): Promise<Map<string, CategoryEntry>> {
  const records = await fetchAllRecords<AirtableCategoryFields>(TABLE_IDS.categories);
  const byName = new Map<string, CategoryEntry>();

  for (const r of records) {
    const f = r.fields;
    const name = f.name ?? '';
    if (!name) continue;

    // Prefer the AI-resolved `actual_qid` when it actually carries a Q-id;
    // otherwise fall back to the human-verified `qid` column.
    const aiQid = aiTextValue(f.actual_qid).trim();
    const aiLooksLikeQid = /^Q\d+$/.test(aiQid);
    const qid = aiLooksLikeQid ? aiQid : (f.qid ?? '').trim();

    byName.set(normalizeName(name), {
      wpId: (f[' wp_id'] ?? f.wp_id) != null ? String(f[' wp_id'] ?? f.wp_id) : '',
      name,
      qid,
      source: (f.source ?? '') as QidSource,
      notes: f.match_label || f.match_desc || undefined,
    });
  }
  return byName;
}
