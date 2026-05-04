import { BasicData, runSparql, parseWktCoords } from '../wikidata';

const CHUNK_SIZE = 50;

function getQidFromBinding(binding: { item: { value: string } }): string {
  return binding.item.value.split('/').pop()!;
}

function ensureEntry(result: Map<string, BasicData>, qid: string): BasicData {
  if (!result.has(qid)) result.set(qid, {});
  return result.get(qid)!;
}

function setIfMissing(target: BasicData, key: keyof BasicData, value: string | undefined): void {
  if (value && !target[key]) {
    (target as Record<string, any>)[key] = value;
  }
}

function applyBinding(result: Map<string, BasicData>, b: any): void {
  const qid = getQidFromBinding(b);
  const entry = ensureEntry(result, qid);

  // Label — wikibase:label returns ?itemLabel; skip if it echoes back the QID URI
  const lv = b.itemLabel?.value;
  if (lv && lv !== qid && !lv.startsWith('Q') && !entry.label) {
    entry.label = lv;
  }

  // Description
  setIfMissing(entry, 'description', b.itemDescription?.value);

  // Image filename — SPARQL returns the full Special:FilePath URL
  if (b.image?.value && !entry.imageFilename) {
    const decoded = decodeURIComponent(b.image.value);
    const filename = decoded.split('Special:FilePath/').pop();
    if (filename) entry.imageFilename = filename;
  }

  // Location name
  setIfMissing(entry, 'locationName', b.locationLabel?.value);

  // Location coordinates (WKT "Point(lon lat)")
  if (b.locationCoords?.value && !entry.locationCoords) {
    entry.locationCoords = parseWktCoords(b.locationCoords.value);
  }

  // External identifiers
  setIfMissing(entry, 'p5199', b.p5199?.value);
  setIfMissing(entry, 'p1711', b.p1711?.value);
  setIfMissing(entry, 'p214', b.p214?.value);
}

export async function batchFetchBasicData(qids: string[]): Promise<Map<string, BasicData>> {
  const result = new Map<string, BasicData>();
  if (qids.length === 0) return result;

  // Process in chunks of 50 to stay within SPARQL query limits
  for (let i = 0; i < qids.length; i += CHUNK_SIZE) {
    const chunk = qids.slice(i, i + CHUNK_SIZE);
    const values = chunk.map((q) => `wd:${q}`).join(' ');

    const query = `
SELECT ?item ?itemLabel ?itemDescription ?image
       ?location ?locationLabel ?locationCoords
       ?p5199 ?p1711 ?p214
WHERE {
  VALUES ?item { ${values} }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL {
    { ?item wdt:P276 ?location }
    UNION { ?item wdt:P195 ?location }
    UNION { ?item wdt:P127 ?location }
    OPTIONAL { ?location wdt:P625 ?locationCoords }
  }
  OPTIONAL { ?item wdt:P5199 ?p5199 }
  OPTIONAL { ?item wdt:P1711 ?p1711 }
  OPTIONAL { ?item wdt:P214  ?p214  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,fr,de,ar,am,mul".
  }
}`;

    try {
      const bindings = await runSparql(query);
      for (const b of bindings) {
        applyBinding(result, b);
      }
    } catch (e) {
      console.error(`batchFetchBasicData chunk failed:`, e);
    }
  }

  return result;
}
