import type { ArtifactCard } from '@/lib/types';

/** A curator pin from content/pins.json: a featured artifact with a short note. */
export interface Pin {
  qid: string;
  text: string;
}

export interface FeaturedArtifact {
  card: ArtifactCard;
  image: string | null;
  pinText: string | null;
}

/** Keeps pins with a QID-shaped `qid` and a string `text`; anything else is skipped silently. */
export function parsePins(raw: unknown): Pin[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const pins = (raw as { pins?: unknown }).pins;
  if (!Array.isArray(pins)) return [];
  const out: Pin[] = [];
  for (const entry of pins) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { qid, text } = entry as { qid?: unknown; text?: unknown };
    if (typeof qid === 'string' && /^Q\d+$/.test(qid) && typeof text === 'string') {
      out.push({ qid, text });
    }
  }
  return out;
}

const byText = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * Featured artifacts: pinned ones first in pin order (pinned artifacts without
 * an image included; unknown QIDs skipped, the first duplicate wins), then every
 * other artifact with an image, ordered by holder name (no holder last), then title.
 */
export function selectFeatured(cards: ArtifactCard[], pins: Pin[]): FeaturedArtifact[] {
  const byQid = new Map(cards.map((c) => [c.wpId, c]));
  const pinned = new Map<string, FeaturedArtifact>();
  for (const pin of pins) {
    const card = byQid.get(pin.qid);
    if (!card || pinned.has(pin.qid)) continue;
    pinned.set(pin.qid, { card, image: card.imageUrls[0] ?? null, pinText: pin.text });
  }

  const rest = cards
    .filter((c) => !pinned.has(c.wpId) && c.imageUrls.length > 0)
    .sort((a, b) => {
      const ha = a.holder?.name;
      const hb = b.holder?.name;
      if (ha && !hb) return -1;
      if (!ha && hb) return 1;
      if (ha && hb) {
        const byHolder = byText(ha, hb);
        if (byHolder !== 0) return byHolder;
      }
      return byText(a.title, b.title);
    })
    .map((card) => ({ card, image: card.imageUrls[0] ?? null, pinText: null }));

  return [...pinned.values(), ...rest];
}
