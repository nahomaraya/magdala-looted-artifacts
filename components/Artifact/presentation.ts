import type { ArtifactCard } from '@/lib/types';
import type { ReviewWikidataHit } from '../ReviewMap/reviewMapTypes';
import { UNKNOWN_HOLDER } from '../ReviewMap/reviewSession';

/** Every artifact in this project was taken in the same event. */
export const TAKEN_FROM = 'Maqdala, Ethiopia (Battle of Magdala, 1868)';

export type Presentation = {
  title: string;
  image: string | undefined;
  primarySource: string | null;
  wikidataUrl: string | null;
  currentLocation: string;
  responsible: string | null;
};

/** Everything one artifact needs in order to be displayed. Pure. */
export function presentation(
  card: ArtifactCard,
  hits: Record<string, ReviewWikidataHit>,
): Presentation {
  const hit = card.dedup.method === 'p973' && card.dedup.qid ? hits[card.dedup.qid] : undefined;
  return {
    title: hit?.label ?? card.title,
    image: hit?.imageUrl ?? card.imageUrls[0],
    primarySource: card.sourceLinks[0] ?? card.url ?? null,
    wikidataUrl:
      hit?.wikidataUrl ??
      (card.dedup.qid ? `https://www.wikidata.org/wiki/${card.dedup.qid}` : null),
    currentLocation: card.where ?? card.holder?.name ?? 'Unknown',
    responsible:
      card.holder?.name && card.holder.name !== UNKNOWN_HOLDER ? card.holder.name : null,
  };
}

const REFERENCE_DOMAIN_LABELS: Record<string, string> = {
  'britishmuseum.org': 'British Museum',
  'bl.uk': 'British Library',
  'vam.ac.uk': 'Victoria & Albert Museum',
  'rct.uk': 'Royal Collection Trust',
  'nationalarmymuseum.org.uk': 'National Army Museum',
  'nms.ac.uk': 'National Museums Scotland',
  'bodleian.ox.ac.uk': 'Bodleian Library',
  'digital.bodleian.ox.ac.uk': 'Bodleian Digital',
  'cudl.lib.cam.ac.uk': 'Cambridge Digital Library',
  'lib.cam.ac.uk': 'Cambridge University Library',
  'rylands.manchester.ac.uk': 'John Rylands Library',
  'pittrivers.ox.ac.uk': 'Pitt Rivers Museum',
  'horniman.ac.uk': 'Horniman Museum',
  'wellcomecollection.org': 'Wellcome Collection',
  'smithsonian.edu': 'Smithsonian',
  'si.edu': 'Smithsonian',
  'archive.org': 'Internet Archive',
  'web.archive.org': 'Wayback Machine',
  'jstor.org': 'JSTOR',
  'andersonandgarland.com': 'Anderson & Garland (auction)',
  'christies.com': "Christie's (auction)",
  'sothebys.com': "Sotheby's (auction)",
  'bonhams.com': 'Bonhams (auction)',
};

export function labelForSourceUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, label] of Object.entries(REFERENCE_DOMAIN_LABELS)) {
      if (host === domain || host.endsWith('.' + domain)) return label;
    }
    return host;
  } catch {
    return url;
  }
}
