import type { ArtifactCard } from './types';
import {
  PROJECT_QID,
  LOOTING_QID,
  MAQDALA_BATTLE_QID,
} from './constants';

/**
 * QuickStatements V1 command builder for a single artifact.
 *
 * Mirrors the target schema in handoff.md: every factual statement carries
 * a reference block with S854 (the Prince-and-Plunder post URL plus any
 * source-link URLs harvested from the post body) and S813 (retrieved =
 * today's date). The P973 statement IS the canonical link back to the post,
 * so it doesn't need its own reference. P5008 and P5102 are project
 * metadata and skip referencing too.
 *
 * If the encoded URL exceeds ~2 KB (browser address-bar limit), callers
 * should fall back to a "copy commands" UI - the same string returned in
 * `commands` can be pasted into the QuickStatements site directly.
 *
 * Things NOT yet emitted, by design:
 *   - P217 (inventory number) - per-museum extraction is fiddly; manual edit
 *   - P18 (image) - would need a Commons upload first
 *   - P361 (Maqdala plunder collection) - drops in once you set
 *     MAQDALA_COLLECTION_QID below, after creating the collection item
 *   - compound categories (e.g., Biblical books -> manuscript + biblical text)
 *     emit only the primary P31; secondary properties are a manual edit
 */

const ETHIOPIA_QID = 'Q115';
const DISPUTED_CLAIM_QID = 'Q18912752';
const P_NATURE_OF_STATEMENT = 'P5102';

/** Default current holder used by `buildMarkAsReturnedUrl`. National Museum
 *  of Ethiopia, Addis Ababa - the most common destination for restituted
 *  Maqdala items. Override in the UI when a different institution received
 *  the artifact. */
export const DEFAULT_RETURNED_HOLDER_QID = 'Q2652168';

/** Set once the Maqdala plunder collection item exists on Wikidata. */
const MAQDALA_COLLECTION_QID: string | null = null;

const QS_BASE = 'https://quickstatements.toolforge.org/#/v1=';

/** Browsers cap URLs around 2 KB; leave a bit of headroom. */
const URL_LIMIT_BYTES = 1900;

/** Cap on extra reference URLs beyond the post URL itself, to keep the
 *  encoded payload from blowing past the URL-length budget on artifacts
 *  with very long source-link lists. */
const MAX_EXTRA_REFS = 4;

function esc(value: string): string {
  return (value ?? '').replace(/"/g, '""').trim();
}

/** Wikidata precision: 9 = year, 10 = month, 11 = day. */
function todayWdDate(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `+${yyyy}-${mm}-${dd}T00:00:00Z/11`;
}

/**
 * Build the trailing `|S854|...|S813|...` segment appended to every factual
 * statement. Multiple references are separated by `!!` per QS V1 syntax,
 * giving each source URL its own structured reference block.
 */
function buildReferenceTail(postUrl: string, sourceLinks: string[]): string {
  const today = todayWdDate();
  const refs: string[] = [];

  // primary reference: the Prince-and-Plunder post itself
  refs.push(`S854|"${esc(postUrl)}"|S813|${today}`);

  // additional references: each harvested catalog/archive link
  for (const link of sourceLinks.slice(0, MAX_EXTRA_REFS)) {
    if (!link) continue;
    refs.push(`S854|"${esc(link)}"|S813|${today}`);
  }

  return '|' + refs.join('!!');
}

function buildDescription(card: ArtifactCard): string {
  const category = card.primaryCategory?.name?.toLowerCase() ?? 'artifact';
  const holder = card.holder?.name ?? 'an unknown holder';
  return `Ethiopian ${category} looted from Maqdala in 1868, now at ${holder}`;
}

/** Just the command text, useful for the "copy commands" clipboard path. */
export function buildQuickStatementsCommands(card: ArtifactCard): string {
  const refTail = buildReferenceTail(card.url, card.sourceLinks);
  const lines: string[] = [];

  // ── item creation + labels ──────────────────────────────────────
  lines.push('CREATE');
  lines.push(`LAST|Len|"${esc(card.title)}"`);
  lines.push(`LAST|Den|"${esc(buildDescription(card))}"`);

  // ── classification ──────────────────────────────────────────────
  if (card.primaryCategory?.qid) {
    lines.push(`LAST|P31|${card.primaryCategory.qid}${refTail}`);
  }

  // ── holder / location ──────────────────────────────────────────
  if (card.holder?.qid) {
    lines.push(`LAST|P195|${card.holder.qid}${refTail}`);
  }

  // ── origin ──────────────────────────────────────────────────────
  lines.push(`LAST|P495|${ETHIOPIA_QID}${refTail}`);

  // ── part of (only when collection item exists) ─────────────────
  if (MAQDALA_COLLECTION_QID) {
    lines.push(`LAST|P361|${MAQDALA_COLLECTION_QID}${refTail}`);
  }

  // ── WikiProject membership (metadata, no reference) ────────────
  lines.push(`LAST|P5008|${PROJECT_QID}`);

  // ── significant event: looting @ Battle of Magdala, 1868 ───────
  // Add the "disputed claim" qualifier for Possible/Suspected items so the
  // reviewer's confidence is preserved into the data model.
  const conf = card.maqdalaConfidence;
  const disputed = conf === 'possible' || conf === 'suspected'
    ? `|${P_NATURE_OF_STATEMENT}|${DISPUTED_CLAIM_QID}`
    : '';
  lines.push(
    `LAST|P793|${LOOTING_QID}` +
    `|P585|+1868-00-00T00:00:00Z/9` +     // year-precision; exact day varied
    `|P2348|${MAQDALA_BATTLE_QID}` +
    disputed +
    refTail,
  );

  // ── described-at-URL: the dedup join key ───────────────────────
  lines.push(`LAST|P973|"${esc(card.url)}"`);

  return lines.join('\n');
}

export interface QuickStatementsResult {
  /** Full prefilled-batch URL. Open in a new tab from a user click. */
  url: string;
  /** The raw V1 command string - useful when `fits` is false. */
  commands: string;
  /** False when `url` is too long for a browser address bar. */
  fits: boolean;
  /** Encoded URL length in bytes; for logging / debugging. */
  byteLength: number;
}

export function buildQuickStatementsUrl(card: ArtifactCard): QuickStatementsResult {
  const commands = buildQuickStatementsCommands(card);
  const url = QS_BASE + encodeURIComponent(commands);
  const byteLength = url.length;
  return { url, commands, byteLength, fits: byteLength <= URL_LIMIT_BYTES };
}

// ─── Restitution flow ─────────────────────────────────────────────────────

export interface MarkAsReturnedOptions {
  /** New current holder, default National Museum of Ethiopia. */
  newHolderQid?: string;
  /** ISO date of the restitution; defaults to today (UTC). */
  returnedOn?: string;
}

/**
 * Generate a QS V1 batch that records a restitution on an EXISTING Wikidata
 * item:
 *   1. Adds `P582 end-time` to the current holder's P195 statement, so the
 *      historical record preserves who held the artifact and until when.
 *   2. Adds a new P195 statement for the receiving Ethiopian institution.
 *
 * Returns null when the artifact has no QID - the caller should still
 * record the return in Airtable in that case and ask the reviewer to
 * apply the Wikidata-side edits manually.
 */
export function buildMarkAsReturnedUrl(
  card: ArtifactCard,
  opts: MarkAsReturnedOptions = {},
): QuickStatementsResult | null {
  const qid = card.dedup.qid;
  if (!qid) return null;

  const newHolder = opts.newHolderQid ?? DEFAULT_RETURNED_HOLDER_QID;
  const returnedOn = opts.returnedOn
    ? `+${opts.returnedOn}T00:00:00Z/11`
    : todayWdDate();
  const refTail = buildReferenceTail(card.url, card.sourceLinks);
  const lines: string[] = [];

  // 1) End-time the prior holder (only if we know who it was). QS will
  //    add the P582 qualifier to the existing matching P195 statement
  //    instead of creating a duplicate.
  if (card.holder?.qid) {
    lines.push(`${qid}|P195|${card.holder.qid}|P582|${returnedOn}`);
  }

  // 2) Add the new current holder.
  lines.push(`${qid}|P195|${newHolder}${refTail}`);

  const commands = lines.join('\n');
  const url = QS_BASE + encodeURIComponent(commands);
  const byteLength = url.length;
  return { url, commands, byteLength, fits: byteLength <= URL_LIMIT_BYTES };
}
