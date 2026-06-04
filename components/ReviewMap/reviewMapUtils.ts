import type { ArtifactCard } from '@/lib/types';

export type MuseumGroup = {
  key: string;
  name: string;
  qid: string | null;
  count: number;
};

export type ReviewStatus = 'already' | 'fuzzy' | 'new';

export function getReviewStatus(card: ArtifactCard): ReviewStatus {
  if (card.dedup.method === 'p973' && card.dedup.qid) return 'already';
  if (card.dedup.method === 'fuzzy' && card.dedup.qid) return 'fuzzy';
  return 'new';
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

export const UNKNOWN_HOLDER = 'Unknown / Unresolved';

export interface ReviewWikidataHit {
  qid: string;
  label: string;
  imageUrl?: string;
  wikidataUrl: string;
}

