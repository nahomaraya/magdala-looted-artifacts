export type EventColor = 'red' | 'gold' | 'green' | 'neutral';

export interface Participant {
  qid: string;
  label: string;
  portraitUrl?: string;
}

export interface OwnershipLink {
  qid: string;
  label: string;
}

export interface ProvenanceEvent {
  eventType: string;
  eventQID: string;
  eventLabel: string;
  color: EventColor;
  date?: string;
  period?: string;
  location?: string;
  locationCoords?: [number, number];
  participants: Participant[];
  beforehandOwnedBy?: OwnershipLink;
  afterwardOwnedBy?: OwnershipLink;
}

export interface ExternalIdentifier {
  property: string;
  propertyLabel: string;
  value: string;
  url: string;
}

export interface CurrentLocation {
  name: string;
  coords: [number, number];
}

export interface Artifact {
  qid: string;
  label: string;
  description?: string;
  imageUrl?: string;
  currentLocation: CurrentLocation;
  provenance: ProvenanceEvent[];
  identifiers: ExternalIdentifier[];
  wikidataUrl: string;
  dataSource: 'sparql' | 'fallback';
}

// ─── Review pipeline (Prince-and-Plunder → Wikidata) ─────────────────────

/** Status assigned by fill_qids.py / Airtable verification. */
export type QidSource =
  | 'seed'        // handoff-verified, locked in
  | 'special'     // API-verified hard-code
  | 'proposed'    // wbsearchentities suggestion - needs audit
  | 'kept'        // prior auto-match preserved
  | 'qualifier'   // use as qualifier on another statement
  | 'compound'    // split into multiple properties (P31 + P136, etc.)
  | 'skip'        // do not generate a statement from this row
  | 'none'        // keep as free text, no QID
  | 'wikidata'    // resolved directly from a Wikidata statement (read path)
  | '';

export interface TagEntry {
  wpId: string;
  name: string;
  qid: string;              // empty if unresolved
  source: QidSource;
  count: number;
  verificationStatus?: string; // from Airtable verified CSV
  notes?: string;
}

export interface CategoryEntry {
  wpId: string;
  name: string;
  qid: string;
  source: QidSource;
  notes?: string;
}

export type MaqdalaConfidence = 'strong' | 'clear' | 'possible' | 'suspected';

export interface ResolvedHolder {
  rawName: string;                  // original tag_names value from artifact CSV
  name: string;                     // canonical name from the tags CSV
  qid: string | null;               // null if unmapped / source == skip|none
  source: QidSource;
  coords: [number, number];
  country?: string;                 // P17 label of the holder, when stated
  verificationStatus?: string;
}

export interface ResolvedCategory {
  rawName: string;
  name: string;
  qid: string | null;
  source: QidSource;
  notes?: string;
  isCompound: boolean;
  isQualifier: boolean;
  isSkip: boolean;
}

/** Imported here rather than re-exported from dedup to avoid pulling
 *  server-only modules into client component import graphs. */
export interface DedupResultLite {
  exists: boolean;
  qid: string | null;
  method: 'p973' | 'fuzzy' | 'none';
  confidence: number;
  matchedLabel?: string;
  matchedDesc?: string;
}

/** The fully joined data shape rendered on the map and review panel. */
export interface ArtifactCard {
  // raw CSV / Airtable
  wpId: string;
  /** Airtable record id, when sourced from Airtable. Empty otherwise. */
  airtableId?: string;
  slug: string;
  url: string;
  title: string;
  weakLink: boolean;       // trailing-* in title => weaker provenance
  what?: string;
  where?: string;
  imageUrls: string[];
  sourceLinks: string[];
  datePublished?: string;
  /** True when the artifact has been recorded as returned to Ethiopia. */
  returned?: boolean;
  /** Latest return date, ISO `YYYY-MM-DD`; absent when undated. */
  returnedDate?: string;

  // resolved joins
  holder: ResolvedHolder | null;       // primary holder for the map pin
  allHolders: ResolvedHolder[];
  primaryCategory: ResolvedCategory | null;
  allCategories: ResolvedCategory[];
  maqdalaConfidence: MaqdalaConfidence | null;

  // gating
  isReviewable: boolean;   // false if every category is "skip" (Features, News, etc.)

  // dedup
  dedup: DedupResultLite;
}
