import { describe, expect, it } from 'vitest';
import { resolveLegacyWpId } from '@/lib/legacyLinks';
import type { ArtifactCard } from '@/lib/types';

function card(wpId: string, url: string): ArtifactCard {
  return { wpId, url, title: wpId } as unknown as ArtifactCard;
}

const cards = [
  card('Q101', 'https://www.theprinceandtheplunder.com/2025/07/02/some-slug/'),
  card('Q102', 'https://www.theprinceandtheplunder.com/2025/06/11/other-slug'),
];

const legacy = {
  '6419': 'https://www.theprinceandtheplunder.com/2025/07/02/some-slug',
  '6408': 'https://www.THEPRINCEANDTHEPLUNDER.com/2025/06/11/other-slug/',
  '1': 'https://www.theprinceandtheplunder.com/2020/01/01/gone/',
};

describe('resolveLegacyWpId', () => {
  it('matches despite a trailing slash difference', () => {
    expect(resolveLegacyWpId('6419', cards, legacy)).toBe('Q101');
  });

  it('matches despite a case difference', () => {
    expect(resolveLegacyWpId('6408', cards, legacy)).toBe('Q102');
  });

  it('returns null for an unknown wpId', () => {
    expect(resolveLegacyWpId('9999', cards, legacy)).toBeNull();
  });

  it('returns null when the mapped URL matches no card', () => {
    expect(resolveLegacyWpId('1', cards, legacy)).toBeNull();
  });

  it('returns null for a non-numeric wpId', () => {
    expect(resolveLegacyWpId('Q12', cards, { Q12: cards[0].url })).toBeNull();
  });
});
