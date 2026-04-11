import pLimit from 'p-limit';
import {
  SPARQL_ENDPOINT,
  WIKIDATA_REST_BASE,
  WIKIDATA_OAUTH_TOKEN_URL,
  COMMONS_API,
  USER_AGENT,
  INSTITUTION_COORDS,
  DEFAULT_COORDS,
  EVENT_TYPES,
  IDENTIFIER_TEMPLATES,
  FALLBACK_QIDS,
} from './constants';
import type { Artifact, ProvenanceEvent, ExternalIdentifier, Participant } from './types';

// ─── OAuth2 Token Cache ────────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.WIKIDATA_CLIENT_ID;
  const clientSecret = process.env.WIKIDATA_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    return null; // unauthenticated fallback
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(WIKIDATA_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    console.warn('OAuth2 token fetch failed, using unauthenticated requests');
    return null;
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

// ─── SPARQL Helpers ────────────────────────────────────────────────────────

export async function runSparql(query: string): Promise<Record<string, { value: string; type: string }>[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`SPARQL request failed: ${res.status}`);
  const data = await res.json();
  return data.results.bindings;
}

// ─── SPARQL Discovery Queries ─────────────────────────────────────────────

const PATTERNS = [
  {
    name: 'pattern1',
    query: `SELECT DISTINCT ?item WHERE {
  ?item p:P793 ?stmt .
  ?stmt ps:P793 wd:Q192623 .
  ?stmt pq:P2348 wd:Q947667 .
}`,
  },
  {
    name: 'pattern2',
    query: `SELECT DISTINCT ?item WHERE {
  ?item p:P793 ?stmt .
  ?stmt ps:P793 wd:Q192623 .
  ?stmt pq:P585 ?date .
  FILTER(YEAR(?date) = 1868)
}`,
  },
  {
    name: 'pattern3',
    query: `SELECT DISTINCT ?item WHERE {
  ?item p:P793 ?stmt .
  ?stmt pq:P2348 wd:Q947667 .
}`,
  },
];

export async function discoverArtifactQIDs(): Promise<{
  qids: string[];
  source: string;
  dataSource: 'sparql' | 'fallback';
}> {
  const seen = new Set<string>();
  const sourceParts: string[] = [];

  for (const { name, query } of PATTERNS) {
    try {
      const bindings = await runSparql(query);
      const qids = bindings.map((b) => b.item.value.split('/').pop()!);
      qids.forEach((q) => seen.add(q));
      if (qids.length > 0) sourceParts.push(`${name}(${qids.length})`);
      console.log(`SPARQL ${name}: ${qids.length} results`);
    } catch (e) {
      console.error(`SPARQL ${name} failed:`, e);
    }
  }

  const qids = Array.from(seen);

  if (qids.length === 0) {
    console.log('All SPARQL patterns returned 0 results — using fallback QIDs');
    return { qids: FALLBACK_QIDS, source: 'fallback', dataSource: 'fallback' };
  }

  return { qids, source: sourceParts.join(', '), dataSource: 'sparql' };
}

// ─── Wikidata REST API ─────────────────────────────────────────────────────

async function wikidataFetch(url: string): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(url, { headers, next: { revalidate: 0 } });
}

async function fetchEntityInfo(qid: string): Promise<Record<string, unknown> | null> {
  const url = `${WIKIDATA_REST_BASE}/entities/items/${qid}`;
  const res = await wikidataFetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`REST API failed for ${qid}: ${res.status}`);
  }
  return res.json();
}

// ─── Statement Value Extractors ────────────────────────────────────────────

function getStatementContent(statements: unknown, prop: string): unknown {
  const stmts = (statements as Record<string, unknown[]>)?.[prop];
  if (!Array.isArray(stmts) || stmts.length === 0) return undefined;
  return (stmts[0] as Record<string, unknown>)?.value;
}

function unwrapStatementValue(raw: unknown): { type?: string; content: unknown } {
  const val = raw as Record<string, unknown> | undefined;
  if (!val || typeof val !== 'object') {
    return { content: undefined };
  }

  // Older payload shape: { type: 'string' | 'wikibase-entityid' | ..., content: ... }
  if ('type' in val && 'content' in val) {
    return {
      type: typeof val.type === 'string' ? val.type : undefined,
      content: val.content,
    };
  }

  // Newer REST payload shape: { type: 'value', content: ... }
  if (val.type === 'value' && 'content' in val) {
    return { type: 'value', content: val.content };
  }

  return { content: val };
}

function getStringContent(statements: unknown, prop: string): string | undefined {
  const { type, content } = unwrapStatementValue(getStatementContent(statements, prop));
  if (typeof content === 'string') return content;
  if (type === 'string' && typeof content === 'string') return content;
  return undefined;
}

function getEntityId(statements: unknown, prop: string): string | undefined {
  const { content } = unwrapStatementValue(getStatementContent(statements, prop));
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>;
    if (typeof obj.id === 'string') return obj.id;
  }
  return undefined;
}

function getCoords(statements: unknown, prop: string): [number, number] | undefined {
  const { content } = unwrapStatementValue(getStatementContent(statements, prop));
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>;
    const latRaw = obj.latitude;
    const lonRaw = obj.longitude;
    const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
    const lon = typeof lonRaw === 'number' ? lonRaw : Number(lonRaw);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      return [lat, lon];
    }
  }
  return undefined;
}

function getLabel(entity: Record<string, unknown>): string | undefined {
  const labels = entity.labels as Record<string, { value: string }> | undefined;
  return labels?.en?.value;
}

function getDescription(entity: Record<string, unknown>): string | undefined {
  const descriptions = entity.descriptions as Record<string, { value: string }> | undefined;
  return descriptions?.en?.value;
}

// ─── Image Resolution ──────────────────────────────────────────────────────

async function resolveCommonsImage(filename: string): Promise<string | undefined> {
  const url = new URL(COMMONS_API);
  url.searchParams.set('action', 'query');
  url.searchParams.set('titles', `File:${filename}`);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return undefined;
    for (const page of Object.values(pages) as Record<string, unknown>[]) {
      const imgUrl = (page?.imageinfo as { url: string }[] | undefined)?.[0]?.url;
      if (imgUrl) return imgUrl;
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ─── Coordinate Resolution ─────────────────────────────────────────────────

function lookupByName(name: string): [number, number] | undefined {
  const lower = name.toLowerCase();
  for (const [key, coords] of Object.entries(INSTITUTION_COORDS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return coords;
    }
  }
  return undefined;
}

async function resolveCurrentLocation(
  statements: unknown,
): Promise<{ name: string; coords: [number, number] }> {
  for (const prop of ['P276', 'P195', 'P127']) {
    const entityId = getEntityId(statements, prop);
    if (!entityId) continue;

    try {
      const locEntity = await fetchEntityInfo(entityId);
      if (!locEntity) continue;

      const locLabel = getLabel(locEntity) ?? entityId;
      const locStatements = locEntity.statements;

      const coords = getCoords(locStatements, 'P625');
      if (coords) return { name: locLabel, coords };

      const byName = lookupByName(locLabel);
      if (byName) return { name: locLabel, coords: byName };
    } catch (e) {
      console.error(`Location resolution failed for ${entityId}:`, e);
    }
  }

  return { name: 'Unknown Location', coords: DEFAULT_COORDS };
}

// ─── Provenance Chain ──────────────────────────────────────────────────────

function cleanDate(raw: string): string {
  return raw.replace(/^\+/, '').split('T')[0];
}

function createProvenanceEvent(
  eventQID: string,
  binding: Record<string, { value: string; type: string }>,
): ProvenanceEvent {
  const eventInfo = EVENT_TYPES[eventQID];
  const eventLabel = binding.eventLabel?.value ?? eventInfo?.label ?? 'Event';
  const color = eventInfo?.color ?? 'neutral';

  return {
    eventType: eventQID,
    eventQID,
    eventLabel,
    color,
    date: binding.date?.value ? cleanDate(binding.date.value) : undefined,
    period: binding.periodLabel?.value,
    location: binding.locationLabel?.value,
    participants: [],
  };
}

function addParticipantToEvent(
  event: ProvenanceEvent,
  binding: Record<string, { value: string; type: string }>,
): void {
  if (binding.participant?.value) {
    const participantQID = binding.participant.value.split('/').pop()!;
    if (!event.participants.some((p) => p.qid === participantQID)) {
      event.participants.push({
        qid: participantQID,
        label: binding.participantLabel?.value ?? participantQID,
      });
    }
  }
}

async function buildProvenanceChain(qid: string): Promise<ProvenanceEvent[]> {
  const query = `
SELECT ?eventType ?eventLabel ?date ?periodLabel ?locationLabel ?participant ?participantLabel WHERE {
  wd:${qid} p:P793 ?stmt .
  ?stmt ps:P793 ?eventType .
  OPTIONAL { ?stmt pq:P585 ?date }
  OPTIONAL {
    ?stmt pq:P2348 ?period .
    ?period rdfs:label ?periodLabel .
    FILTER(LANG(?periodLabel) = "en")
  }
  OPTIONAL {
    ?stmt pq:P276 ?location .
    ?location rdfs:label ?locationLabel .
    FILTER(LANG(?locationLabel) = "en")
  }
  OPTIONAL {
    ?stmt pq:P710 ?participant .
    ?participant rdfs:label ?participantLabel .
    FILTER(LANG(?participantLabel) = "en")
  }
  OPTIONAL {
    ?eventType rdfs:label ?eventLabel .
    FILTER(LANG(?eventLabel) = "en")
  }
}
ORDER BY ?date`;

  try {
    const bindings = await runSparql(query);
    const eventMap = new Map<string, ProvenanceEvent>();

    for (const b of bindings) {
      const eventQID = b.eventType?.value?.split('/').pop() ?? '';
      const key = `${eventQID}_${b.date?.value ?? ''}_${b.locationLabel?.value ?? ''}`;

      if (!eventMap.has(key)) {
        eventMap.set(key, createProvenanceEvent(eventQID, b));
      }

      const event = eventMap.get(key)!;
      addParticipantToEvent(event, b);
    }

    return Array.from(eventMap.values());
  } catch (e) {
    console.error(`Provenance query failed for ${qid}:`, e);
    return [];
  }
}

// ─── External Identifiers ─────────────────────────────────────────────────

function extractIdentifiers(statements: unknown): ExternalIdentifier[] {
  const results: ExternalIdentifier[] = [];
  for (const [prop, tpl] of Object.entries(IDENTIFIER_TEMPLATES)) {
    const value = getStringContent(statements, prop);
    if (!value) continue;
    results.push({
      property: prop,
      propertyLabel: tpl.label,
      value,
      url: tpl.template.replace('{value}', encodeURIComponent(value)),
    });
  }
  return results;
}

// ─── Participant Portraits ────────────────────────────────────────────────

async function resolvePortraits(participants: Participant[]): Promise<Participant[]> {
  return Promise.all(
    participants.map(async (p) => {
      try {
        const entity = await fetchEntityInfo(p.qid);
        if (!entity) return p;
        const filename = getStringContent(entity.statements, 'P18');
        if (!filename) return p;
        const portraitUrl = await resolveCommonsImage(filename);
        return portraitUrl ? { ...p, portraitUrl } : p;
      } catch {
        return p;
      }
    }),
  );
}

// ─── Batch SPARQL Enrichment ──────────────────────────────────────────────
// Uses wikibase:label service which auto-falls back through en/fr/de/am/mul,
// and fetches location + coordinates in one round trip.

interface BasicData {
  label?: string;
  description?: string;
  imageFilename?: string;
  locationName?: string;
  locationCoords?: [number, number];
  p5199?: string;
  p1711?: string;
  p214?: string;
}

function parseWktCoords(wkt: string): [number, number] | undefined {
  // WKT format: "Point(longitude latitude)" — note lon comes first
  const match = wkt.match(/Point\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i);
  if (!match) return undefined;
  const lon = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return undefined;
  return [lat, lon];
}

async function batchFetchBasicData(qids: string[]): Promise<Map<string, BasicData>> {
  const result = new Map<string, BasicData>();
  if (qids.length === 0) return result;

  // Process in chunks of 50 to stay within SPARQL query limits
  const CHUNK = 50;
  for (let i = 0; i < qids.length; i += CHUNK) {
    const chunk = qids.slice(i, i + CHUNK);
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
        const qid = b.item.value.split('/').pop()!;
        if (!result.has(qid)) result.set(qid, {});
        const entry = result.get(qid)!;

        // Label — wikibase:label returns ?itemLabel; skip if it echoes back the QID URI
        const lv = b.itemLabel?.value;
        if (lv && lv !== qid && !lv.startsWith('Q') && !entry.label) {
          entry.label = lv;
        }

        // Description
        const dv = b.itemDescription?.value;
        if (dv && !entry.description) entry.description = dv;

        // Image filename — SPARQL returns the full Special:FilePath URL
        if (b.image?.value && !entry.imageFilename) {
          const decoded = decodeURIComponent(b.image.value);
          const filename = decoded.split('Special:FilePath/').pop();
          if (filename) entry.imageFilename = filename;
        }

        // Location name
        const ln = b.locationLabel?.value;
        if (ln && !entry.locationName) entry.locationName = ln;

        // Location coordinates (WKT "Point(lon lat)")
        if (b.locationCoords?.value && !entry.locationCoords) {
          entry.locationCoords = parseWktCoords(b.locationCoords.value);
        }

        // External identifiers
        if (b.p5199?.value && !entry.p5199) entry.p5199 = b.p5199.value;
        if (b.p1711?.value && !entry.p1711) entry.p1711 = b.p1711.value;
        if (b.p214?.value  && !entry.p214)  entry.p214  = b.p214.value;
      }
    } catch (e) {
      console.error(`batchFetchBasicData chunk failed:`, e);
    }
  }

  return result;
}

// ─── Artifact Enrichment ──────────────────────────────────────────────────

const limit = pLimit(5);

async function enrichArtifact(
  qid: string,
  dataSource: 'sparql' | 'fallback',
  basic: BasicData = {},
): Promise<Artifact | null> {
  try {
    // ── Label & description ─────────────────────────────────────
    let label = basic.label;
    let description = basic.description;

    // REST API fallback for label (e.g. fallback QIDs not covered by batch)
    if (!label) {
      try {
        const entity = await fetchEntityInfo(qid);
        if (entity) {
          label = getLabel(entity);
          description ??= getDescription(entity);

          // Also try identifiers from REST if SPARQL didn't find them
          if (!basic.p5199) basic.p5199 = getStringContent(entity.statements, 'P5199') ?? undefined;
          if (!basic.p1711) basic.p1711 = getStringContent(entity.statements, 'P1711') ?? undefined;
          if (!basic.p214)  basic.p214  = getStringContent(entity.statements, 'P214')  ?? undefined;

          // Image filename fallback
          if (!basic.imageFilename) {
            basic.imageFilename = getStringContent(entity.statements, 'P18') ?? undefined;
          }
        }
      } catch (e) {
        console.warn(`REST fallback failed for ${qid}:`, e);
      }
    }
    label ??= qid;

    // ── Image ──────────────────────────────────────────────────
    let imageUrl: string | undefined;
    if (basic.imageFilename) {
      imageUrl = await resolveCommonsImage(basic.imageFilename);
    }

    // ── Location ───────────────────────────────────────────────
    let currentLocation: { name: string; coords: [number, number] };

    if (basic.locationCoords && basic.locationName) {
      // Best case: SPARQL returned both name and coords
      currentLocation = { name: basic.locationName, coords: basic.locationCoords };
    } else if (basic.locationName) {
      // SPARQL has name but no coords — try hardcoded lookup
      const coords = lookupByName(basic.locationName) ?? DEFAULT_COORDS;
      currentLocation = { name: basic.locationName, coords };
    } else {
      // Nothing from SPARQL — fall back to REST API entity chain
      try {
        const entity = await fetchEntityInfo(qid);
        currentLocation = entity
          ? await resolveCurrentLocation(entity.statements)
          : { name: 'Unknown Location', coords: DEFAULT_COORDS };
      } catch {
        currentLocation = { name: 'Unknown Location', coords: DEFAULT_COORDS };
      }
    }

    // ── Provenance ─────────────────────────────────────────────
    const rawProvenance = await buildProvenanceChain(qid);
    const provenance = await Promise.all(
      rawProvenance.map(async (event) => {
        const withPortraits = await resolvePortraits(event.participants.slice(0, 3));
        return { ...event, participants: withPortraits };
      }),
    );

    // ── External identifiers ───────────────────────────────────
    const identifiers: ExternalIdentifier[] = [];
    const idMap: Record<string, string | undefined> = {
      P5199: basic.p5199,
      P1711: basic.p1711,
      P214: basic.p214,
    };
    for (const [prop, value] of Object.entries(idMap)) {
      if (!value) continue;
      const tpl = IDENTIFIER_TEMPLATES[prop];
      if (!tpl) continue;
      identifiers.push({
        property: prop,
        propertyLabel: tpl.label,
        value,
        url: tpl.template.replace('{value}', encodeURIComponent(value)),
      });
    }

    return {
      qid,
      label,
      description,
      imageUrl,
      currentLocation,
      provenance,
      identifiers,
      wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
      dataSource,
    };
  } catch (e) {
    console.error(`Failed to enrich artifact ${qid}:`, e);
    return null;
  }
}

// ─── Server-side Cache ────────────────────────────────────────────────────

let artifactsCache: { data: Artifact[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

export async function getAllArtifacts(): Promise<Artifact[]> {
  if (artifactsCache && Date.now() - artifactsCache.fetchedAt < CACHE_TTL_MS) {
    return artifactsCache.data;
  }

  const { qids, dataSource } = await discoverArtifactQIDs();

  // Single batch SPARQL call for all labels, descriptions, locations, identifiers
  const basicDataMap = await batchFetchBasicData(qids);

  const results = await Promise.all(
    qids.map((qid) => limit(() => enrichArtifact(qid, dataSource, basicDataMap.get(qid) ?? {}))),
  );

  const artifacts = results.filter((a): a is Artifact => a !== null);
  artifactsCache = { data: artifacts, fetchedAt: Date.now() };
  return artifacts;
}

export async function getArtifact(qid: string): Promise<Artifact | null> {
  const basicMap = await batchFetchBasicData([qid]);
  return limit(() => enrichArtifact(qid, 'sparql', basicMap.get(qid) ?? {}));
}
