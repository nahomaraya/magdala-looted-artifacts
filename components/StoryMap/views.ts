// View ids and /map URL helpers. Pure: no React or Next imports, so the server
// page and the client shell can both use them.

export const VIEWS = ['map', 'library'] as const;
export type ViewId = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<ViewId, string> = {
  map: 'Dispersal',
  library: 'Library',
};

const DEFAULT_VIEW: ViewId = 'map';
const QID_PATTERN = /^Q\d+$/;

/** Unknown, empty or missing values fall back to the Dispersal View. */
export function parseView(raw: string | undefined | null): ViewId {
  return (VIEWS as readonly string[]).includes(raw ?? '') ? (raw as ViewId) : DEFAULT_VIEW;
}

/** Builds a /map URL, omitting `view` for the default View and `qid` when there is no selection. */
export function mapHref(view: ViewId, qid: string | null): string {
  const params = new URLSearchParams();
  if (view !== DEFAULT_VIEW) params.set('view', view);
  if (qid !== null) params.set('qid', qid);
  const query = params.toString();
  return query ? `/map?${query}` : '/map';
}

/** Returns the value only if it looks like a Wikidata QID, otherwise null. */
export function parseQid(raw: string | undefined | null): string | null {
  return raw && QID_PATTERN.test(raw) ? raw : null;
}
