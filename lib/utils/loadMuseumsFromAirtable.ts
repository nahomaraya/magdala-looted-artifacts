// Server-only. Loads the Museums table from Airtable, returning a Map
// keyed by normalized name (matches the contract of loadMuseumsCsv).
import { fetchAllRecords, aiTextValue, TABLE_IDS } from '../airtable';
import { normalizeName } from './loadTagsCsv';
import type { MuseumEntry } from './loadMuseumsCsv';

/** `location`, `url`, and `coordiniates` are aiText fields per the schema -
 *  Airtable returns them as { value, state, isStale } objects, not strings. */
type Cell = string | { value?: string };

interface AirtableMuseumFields {
  name?: string;
  location?: Cell;
  url?: Cell;
  coordiniates?: Cell; // typo preserved per the CSV header
  coordinates?: Cell;  // accept either, just in case
}

export interface AirtableMuseum extends MuseumEntry {
  airtableId: string;
}

function parseCoords(raw: string | undefined): [number, number] | undefined {
  if (!raw) return undefined;
  const [latStr, lngStr] = raw.split(',').map((s) => s.trim());
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return [lat, lng];
}

export async function loadMuseumsFromAirtable(): Promise<Map<string, AirtableMuseum>> {
  const records = await fetchAllRecords<AirtableMuseumFields>(TABLE_IDS.museums);
  const byName = new Map<string, AirtableMuseum>();

  for (const r of records) {
    const name = r.fields.name?.trim();
    if (!name) continue;
    const coordRaw = aiTextValue(r.fields.coordiniates ?? r.fields.coordinates);
    const location = aiTextValue(r.fields.location) || undefined;
    const url      = aiTextValue(r.fields.url)      || undefined;
    byName.set(normalizeName(name), {
      airtableId: r.id,
      name,
      location,
      url,
      coords: parseCoords(coordRaw),
    });
  }
  return byName;
}

/** Variant keyed by Airtable record id, for joining via the `Museum Link` field. */
export async function loadMuseumsByRecordId(): Promise<Map<string, AirtableMuseum>> {
  const records = await fetchAllRecords<AirtableMuseumFields>(TABLE_IDS.museums);
  const byId = new Map<string, AirtableMuseum>();

  for (const r of records) {
    const name = r.fields.name?.trim() ?? '';
    const coordRaw = aiTextValue(r.fields.coordiniates ?? r.fields.coordinates);
    byId.set(r.id, {
      airtableId: r.id,
      name,
      location: aiTextValue(r.fields.location) || undefined,
      url:      aiTextValue(r.fields.url)      || undefined,
      coords:   parseCoords(coordRaw),
    });
  }
  return byId;
}
