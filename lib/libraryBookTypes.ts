// Classifies library artifacts (books & manuscripts) into a single primary
// "book type" derived from their source-site categories.
//
// An artifact usually carries several categories — a physical form
// ("Manuscripts", "Scrolls") plus zero or more genre/subject tags
// ("Biblical books", "Prayers, psalms, hymns, services", …). We pick the most
// specific genre first and fall back to the generic form, so every library
// card lands in exactly one bucket and the per-type counts sum to the total.
import type { ArtifactCard } from './types';

export interface BookType {
  id: string;
  label: string;
  /** Short blurb shown in the filter bar / tooltips. */
  blurb: string;
  /** Static Tailwind classes for the badge (kept literal for JIT scanning). */
  badgeClass: string;
  /** Matches a resolved category name (case-insensitive). */
  matches: (categoryName: string) => boolean;
}

/** Ordered most-specific → most-generic. First match wins as the primary type. */
const BOOK_TYPES: BookType[] = [
  {
    id: 'biblical',
    label: 'Biblical books',
    blurb: 'Scripture — Octateuchs, Gospels, Psalters and other biblical texts.',
    badgeClass: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    matches: (n) => /biblical books/i.test(n),
  },
  {
    id: 'prayers',
    label: 'Prayers & liturgy',
    blurb: 'Prayers, psalms, hymns and service books.',
    badgeClass: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
    matches: (n) => /prayers?,?\s*psalms|prayer book|liturg|hymn|services/i.test(n),
  },
  {
    id: 'hagiography',
    label: "Saints' lives",
    blurb: 'Hagiography — acts and miracles of the saints.',
    badgeClass: 'border-rose-400/40 bg-rose-400/10 text-rose-200',
    matches: (n) => /acts & miracles of the saints|hagiograph/i.test(n),
  },
  {
    id: 'marian',
    label: 'Marian & festal',
    blurb: 'Festivals and miracles of Mary, Jesus and the angels.',
    badgeClass: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
    matches: (n) => /festivals & miracles|miracles of mary/i.test(n),
  },
  {
    id: 'theological',
    label: 'Theological',
    blurb: 'Ecclesiastical and theological works.',
    badgeClass: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    matches: (n) => /ecclesiastical & theological|theological/i.test(n),
  },
  {
    id: 'historical',
    label: 'Historical & legal',
    blurb: 'Historical, legal, medical and other secular texts.',
    badgeClass: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
    matches: (n) => /historical, legal, medical/i.test(n),
  },
  {
    id: 'scrolls',
    label: 'Scrolls',
    blurb: 'Parchment or paper scrolls (often protective/magic scrolls).',
    badgeClass: 'border-orange-400/40 bg-orange-400/10 text-orange-200',
    matches: (n) => /\bscrolls?\b/i.test(n),
  },
  {
    id: 'letters',
    label: 'Letters',
    blurb: 'Correspondence and written messages.',
    badgeClass: 'border-teal-400/40 bg-teal-400/10 text-teal-200',
    matches: (n) => /\bletters?\b/i.test(n),
  },
  {
    id: 'loose-pages',
    label: 'Loose pages',
    blurb: 'Detached folios and leaves.',
    badgeClass: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
    matches: (n) => /loose pages|\bfolio\b|\bleaf\b/i.test(n),
  },
  {
    id: 'manuscript',
    label: 'Manuscripts',
    blurb: 'Handwritten books with no more specific genre recorded.',
    badgeClass: 'border-gold/35 bg-gold/10 text-gold',
    matches: (n) => /\bmanuscripts?\b|\bbooks?\b/i.test(n),
  },
];

/** Catch-all for the rare library item with no recognised text category. */
export const OTHER_BOOK_TYPE: BookType = {
  id: 'other',
  label: 'Other',
  blurb: 'Uncategorised text-bearing artifacts.',
  badgeClass: 'border-parchment-dim/30 bg-white/5 text-parchment-dim',
  matches: () => false,
};

/** The primary (most specific) book type for an artifact. */
export function classifyBookType(artifact: ArtifactCard): BookType {
  const names = artifact.allCategories.map((c) => c.name);
  return BOOK_TYPES.find((type) => names.some((name) => type.matches(name))) ?? OTHER_BOOK_TYPE;
}

export interface BookTypeBucket extends BookType {
  count: number;
}

/**
 * Group artifacts by primary book type, preserving the canonical taxonomy
 * order and dropping types with no matching artifacts. Counts sum to
 * `artifacts.length`.
 */
export function buildBookTypeBuckets(artifacts: ArtifactCard[]): BookTypeBucket[] {
  const counts = new Map<string, number>();
  for (const artifact of artifacts) {
    const id = classifyBookType(artifact).id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return [...BOOK_TYPES, OTHER_BOOK_TYPE]
    .filter((type) => counts.has(type.id))
    .map((type) => ({ ...type, count: counts.get(type.id)! }));
}
