import type { ExternalIdentifier } from '../types';
import { runSparql } from '../wikidata';

function extractQid(value?: string): string | undefined {
  return value?.split('/').pop();
}

function getPropLabel(propLabel: string | undefined, prop: string): string {
  return propLabel ?? prop;
}

function hasRefUrl(ids: ExternalIdentifier[], refUrl: string): boolean {
  return ids.some((id) => id.url === refUrl);
}

function addReference(
  result: Map<string, ExternalIdentifier[]>,
  qid: string,
  prop: string,
  propLabel: string,
  refUrl: string,
): void {
  if (!result.has(qid)) result.set(qid, []);
  const ids = result.get(qid)!;
  if (!hasRefUrl(ids, refUrl)) {
    ids.push({ property: prop, propertyLabel: propLabel, value: refUrl, url: refUrl });
  }
}

// ─── Reference URLs ───────────────────────────────────────────────────────
// For each statement on every item, walks the prov:wasDerivedFrom reference
// blocks and collects every P854 (reference URL). These are the actual
// museum/collection pages cited as sources — they point directly to the
// artifact's live catalogue entry.
export async function batchFetchReferenceUrls(
  qids: string[]): Promise<Map<string, ExternalIdentifier[]>> {
  const result = new Map<string, ExternalIdentifier[]>();
  if (qids.length === 0) return result;

  const CHUNK = 50;
  for (let i = 0; i < qids.length; i += CHUNK) {
    const chunk = qids.slice(i, i + CHUNK);
    const values = chunk.map((q) => `wd:${q}`).join(' ');

    const query = `
SELECT DISTINCT ?item ?prop ?propLabel ?refUrl WHERE {
  VALUES ?item { ${values} }
  ?item ?p ?statement .
  ?statement prov:wasDerivedFrom ?reference .
  ?reference pr:P854 ?refUrl .
  ?prop wikibase:claim ?p .
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}`;

    try {
      const bindings = await runSparql(query);
      for (const b of bindings) {
        const qid = extractQid(b.item?.value);
        const prop = extractQid(b.prop?.value);
        const refUrl = b.refUrl?.value;
        if (!qid || !prop || !refUrl) continue;

        addReference(result, qid, prop, getPropLabel(b.propLabel?.value, prop), refUrl);
      }
    } catch (e) {
      console.error('batchFetchReferenceUrls failed:', e);
    }
  }

  return result;
}
