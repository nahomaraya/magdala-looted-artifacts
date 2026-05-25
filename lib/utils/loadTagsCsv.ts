import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './parseCsv';
import type { TagEntry, QidSource } from '../types';

const DEFAULT_FILE = path.join(
  process.cwd(),
  'data',
  'Wikidata Tags-Grid view-verified.csv',
);

export function normalizeName(s: string): string {
  return (s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
    .toLowerCase();
}

export async function loadTagsCsv(file: string = DEFAULT_FILE): Promise<Map<string, TagEntry>> {
  const text = await readFile(file, 'utf-8');
  const rows = parseCsv(text);

  const byName = new Map<string, TagEntry>();
  for (const row of rows) {
    const name = row.name ?? '';
    if (!name) continue;
    const entry: TagEntry = {
      wpId: row.wp_id ?? '',
      name,
      qid: (row.qid ?? '').trim(),
      source: (row.source ?? '') as QidSource,
      count: Number(row.count || 0),
      verificationStatus: row['Verification Status'] || undefined,
      notes: row.match_label || row.match_desc || undefined,
    };
    byName.set(normalizeName(name), entry);
  }

  return byName;
}