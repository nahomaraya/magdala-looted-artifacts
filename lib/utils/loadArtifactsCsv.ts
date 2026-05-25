import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './parseCsv';

export interface CsvArtifact {
  wp_id: string;
  slug: string;
  url: string;
  title: string;
  weak_link?: string;
  what?: string;
  where?: string;
  category_names?: string;
  tag_names?: string;
  source_links?: string;
  image_urls?: string;
  date_published?: string;
  locations?: string;
  'Museum Link'?: string;
}

const DEFAULT_CSV = path.join(process.cwd(), 'data', 'artifacts.csv');

export async function loadArtifactsCsv(file: string = DEFAULT_CSV): Promise<CsvArtifact[]> {
  const text = await readFile(file, 'utf-8');
  return parseCsv(text) as unknown as CsvArtifact[];
}

export async function getArtifactByWpId(
  wpId: string | number,
  file: string = DEFAULT_CSV,
): Promise<CsvArtifact | undefined> {
  const rows = await loadArtifactsCsv(file);
  return rows.find(r => r.wp_id === String(wpId));
}