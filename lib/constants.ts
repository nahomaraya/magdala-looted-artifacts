export const MAGDALA_COORDS: [number, number] = [11.2167, 39.3167];

/** National Museum of Ethiopia, Addis Ababa — the default home for
 *  repatriated ("returned") plunder regardless of its prior holder. */
export const ADDIS_ABABA_COORDS: [number, number] = [9.038333, 38.761944];

export const INSTITUTION_COORDS: Record<string, [number, number]> = {
  'British Museum': [51.5194, -0.1270],
  'British Library': [51.5299, -0.1272],
  'Victoria and Albert Museum': [51.4966, -0.1722],
  'Bodleian Library': [51.7548, -1.2544],
  'Royal Library, Windsor Castle': [51.4839, -0.6044],
  'National Army Museum': [51.4891, -0.1612],
  'National Museum of Scotland': [55.9469, -3.1893],
  'Schøyen Collection': [59.9333, 10.7166],
  'Museum of Archaeology and Anthropology, Cambridge': [52.2014, 0.1195],
};

export const DEFAULT_COORDS: [number, number] = [51.5099, -0.1180];

export const EVENT_TYPES: Record<string, { label: string; color: 'red' | 'gold' | 'neutral' }> = {
  Q192623: { label: 'Looting', color: 'red' },
  Q22340494: { label: 'Acquisition', color: 'gold' },
  Q707482: { label: 'Gift', color: 'gold' },
  Q194189: { label: 'Sale', color: 'gold' },
  Q211557: { label: 'Bequest', color: 'gold' },
};

export const IDENTIFIER_TEMPLATES: Record<string, { label: string; template: string }> = {
  P5199: {
    label: 'British Library',
    template: 'https://www.bl.uk/manuscripts/FullDisplay.aspx?ref={value}',
  },
  P1711: {
    label: 'British Museum',
    template: 'https://www.britishmuseum.org/collection/object/{value}',
  },
  P214: {
    label: 'VIAF',
    template: 'https://viaf.org/viaf/{value}',
  },
};

export const FALLBACK_QIDS = ['Q1123371', 'Q116693582'];

// Wikidata scoping QIDs (which items are in the project) ──────────────────
export const PROJECT_QID = 'Q124538244';     // WikiProject Looted Heritage
export const LOOTING_QID = 'Q192623';        // looting (the event class for P793)
export const MAQDALA_BATTLE_QID = 'Q947667';          // Battle of Magdala — pq:P828 (has cause)
export const BRITISH_EXPEDITION_QID = 'Q743652';      // British expedition to Abyssinia — pq:P2348 (time period)

// Wikidata-sourced read path (lib/getWikidataArtifacts.ts) ─────────────────
export const NATIONAL_MUSEUM_ETHIOPIA_QID = 'Q2652168'; // no longer drives `returned`; kept for reference
export const DISPUTED_CLAIM_QID = 'Q18912752';          // pq:P5102 value flagging a weak link
export const RETURN_EVENT_QID = 'Q65088609';            // P793 value marking an item as returned (pq:P585 = date)
export const LOOTED_ART_QID = 'Q851304';                // universal P31 on every item — filtered from categories

export const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
export const WIKIDATA_REST_BASE = 'https://www.wikidata.org/w/rest.php/wikibase/v1';
export const WIKIDATA_OAUTH_TOKEN_URL =
  'https://www.wikidata.org/w/rest.php/oauth2/access_token';
export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

export const USER_AGENT =
  'MagdalaLootedArtifactsMap/1.0 (https://github.com/looted-artifacts; research@example.com)';
