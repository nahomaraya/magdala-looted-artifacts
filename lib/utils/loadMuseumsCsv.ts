// Server-only.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './parseCsv';
import { normalizeName } from './loadTagsCsv';

export interface MuseumEntry {
  name: string;
  location?: string;
  url?: string;
  coords?: [number, number];
}

const DEFAULT_FILE = path.join(
  process.cwd(),
  'data',
  'Museums-Grid view.csv',
);

/** Parse a "lat, lng" cell into a tuple, or undefined if malformed. */
function parseCoords(raw: string | undefined): [number, number] | undefined {
  if (!raw) return undefined;
  const [latStr, lngStr] = raw.split(',').map((s) => s.trim());
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return [lat, lng];
}

export async function loadMuseumsCsv(
  file: string = DEFAULT_FILE,
): Promise<Map<string, MuseumEntry>> {
  const text = await readFile(file, 'utf-8');
  const rows = parseCsv(text);

  const byName = new Map<string, MuseumEntry>();
  for (const row of rows) {
    const name = row.name ?? '';
    if (!name) continue;
    // The CSV header has a typo ("coordiniates") — accept either spelling.
    const coordRaw = row.coordiniates || row.coordinates || '';
    byName.set(normalizeName(name), {
      name,
      location: row.location || undefined,
      url: row.url || undefined,
      coords: parseCoords(coordRaw),
    });
  }
  return byName;
}
