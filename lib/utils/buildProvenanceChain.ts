import type { ProvenanceEvent } from '../types';
import { runSparql, createProvenanceEvent, addParticipantToEvent } from '../wikidata';

const PROVENANCE_QUERY = (qid: string) => `
SELECT ?eventType ?eventLabel ?date ?periodLabel ?locationLabel
       ?participant ?participantLabel
       ?beforeOwner ?beforeOwnerLabel ?afterOwner ?afterOwnerLabel WHERE {
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
    ?stmt pq:P11811 ?beforeOwner .
    ?beforeOwner rdfs:label ?beforeOwnerLabel .
    FILTER(LANG(?beforeOwnerLabel) = "en")
  }
  OPTIONAL {
    ?stmt pq:P11812 ?afterOwner .
    ?afterOwner rdfs:label ?afterOwnerLabel .
    FILTER(LANG(?afterOwnerLabel) = "en")
  }
  OPTIONAL {
    ?eventType rdfs:label ?eventLabel .
    FILTER(LANG(?eventLabel) = "en")
  }
}
ORDER BY ?date`;

const COLOR_ORDER: Record<string, number> = { red: 0, gold: 1, neutral: 2 };

function lastUriSegment(value?: string): string {
  return value?.split('/').pop() ?? '';
}

function buildEventKey(binding: any): string {
  const eventQID = lastUriSegment(binding.eventType?.value);
  return `${eventQID}_${binding.date?.value ?? ''}_${binding.locationLabel?.value ?? ''}`;
}

function applyOwnershipQualifiers(event: ProvenanceEvent, binding: any): void {
  if (!event.beforehandOwnedBy && binding.beforeOwner?.value) {
    const ownerQid = lastUriSegment(binding.beforeOwner.value);
    event.beforehandOwnedBy = {
      qid: ownerQid,
      label: binding.beforeOwnerLabel?.value ?? ownerQid,
    };
  }

  if (!event.afterwardOwnedBy && binding.afterOwner?.value) {
    const ownerQid = lastUriSegment(binding.afterOwner.value);
    event.afterwardOwnedBy = {
      qid: ownerQid,
      label: binding.afterOwnerLabel?.value ?? ownerQid,
    };
  }
}

function sortByColor(events: ProvenanceEvent[]): ProvenanceEvent[] {
  return events.sort((a, b) => (COLOR_ORDER[a.color] ?? 2) - (COLOR_ORDER[b.color] ?? 2));
}

export async function buildProvenanceChain(qid: string): Promise<ProvenanceEvent[]> {
  try {
    const bindings = await runSparql(PROVENANCE_QUERY(qid));
    const eventMap = new Map<string, ProvenanceEvent>();

    for (const b of bindings) {
      const key = buildEventKey(b);

      if (!eventMap.has(key)) {
        eventMap.set(key, createProvenanceEvent(lastUriSegment(b.eventType?.value), b));
      }

      const event = eventMap.get(key)!;
      addParticipantToEvent(event, b);
      applyOwnershipQualifiers(event, b);
    }

    return sortByColor(Array.from(eventMap.values()));
  } catch (e) {
    console.error(`Provenance query failed for ${qid}:`, e);
    return [];
  }
}
