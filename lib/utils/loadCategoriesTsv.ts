import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseTsv } from './parseCsv';
import { normalizeName } from './loadTagsCsv';
import type { CategoryEntry, QidSource } from '../types';

const DEFAULT_FILE = path.join(
  process.cwd(),
  'data',
  'categories_qids_filled.tsv',
);

export async function loadCategoriesTsv(
  file: string = DEFAULT_FILE,
): Promise<Map<string, CategoryEntry>> {
  const text = await readFile(file, 'utf-8');
  const rows = parseTsv(text);

  const byName = new Map<string, CategoryEntry>();
  for (const row of rows) {
    const name = row.name ?? '';
    if (!name) continue;
    const entry: CategoryEntry = {
      wpId: row.wp_id ?? '',
      name,
      qid: (row.qid ?? '').trim(),
      source: (row.source ?? '') as QidSource,
      notes: row.match_label || row.match_desc || undefined,
    };
    byName.set(normalizeName(name), entry);
  }

  return byName;
}