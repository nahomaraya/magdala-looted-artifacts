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
