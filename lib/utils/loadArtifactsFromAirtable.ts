// Server-only. Reads the Artifacts table from Airtable and returns rows in
// the same shape the CSV loader used to, with extras for Airtable-specific
// joins (the record ID and the linked Museum record IDs).
import { fetchAllRecords, TABLE_IDS } from '../airtable';
import type { CsvArtifact } from './loadArtifactsCsv';

/** Raw shape coming back from Airtable for the Artifacts table. */
interface AirtableArtifactFields {
  wp_id?: number;
  slug?: string;
  url?: string;
  title?: string;
  weak_link?: boolean;
  what?: string;
  where?: string;
  category_names?: string;
  'Museum Link'?: string[];
  locations?: string[];
  source_links?: string;
  image_urls?: string;
  date_published?: string;
  tag_names?: string;
  'tag_names copy'?: string[];
  Returned?: boolean;
  'Returned date'?: string;
  /** Optional Wikidata Q-id, set manually in Airtable after mass-insert.
   *  Accepts either `qid` or `Wikidata QID` as the column name. */
  qid?: string;
  'Wikidata QID'?: string;
}

/** Adapted shape — extends CsvArtifact with Airtable-only fields. */
export interface AirtableArtifact extends CsvArtifact {
  /** Airtable record id, needed for PATCH operations. */
  airtableId: string;
  /** Linked Museums table record ids. */
  museumLinkIds: string[];
  /** Returned-to-Ethiopia flag (Airtable checkbox). */
  returned: boolean;
  /** ISO date the artifact was returned, if known. */
  returnedDate?: string;
  /** Manually-entered Wikidata Q-id, if set on the Airtable row. */
  qid?: string;
}

export async function loadArtifactsFromAirtable(): Promise<AirtableArtifact[]> {
  const records = await fetchAllRecords<AirtableArtifactFields>(TABLE_IDS.artifacts);

  return records.map((r) => {
    const f = r.fields;
    return {
      airtableId: r.id,
      wp_id: f.wp_id != null ? String(f.wp_id) : '',
      slug:  f.slug  ?? '',
      url:   f.url   ?? '',
      title: f.title ?? '',
      weak_link: f.weak_link ? 'yes' : '',
      what:  f.what  ?? '',
      where: f.where ?? '',
      category_names: f.category_names ?? '',
      tag_names:      f.tag_names      ?? '',
      source_links:   f.source_links   ?? '',
      image_urls:     f.image_urls     ?? '',
      date_published: f.date_published ?? '',
      locations:      Array.isArray(f.locations) ? f.locations.join(' | ') : '',
      museumLinkIds:  f['Museum Link'] ?? [],
      returned:       Boolean(f.Returned),
      returnedDate:   f['Returned date'] || undefined,
      qid:            (f.qid || f['Wikidata QID'] || '').trim() || undefined,
    };
  });
}
