import FeaturedGrid from '@/components/Front/FeaturedGrid';
import { FOCUS_RING } from '@/components/Front/focus';
import HeroCollage from '@/components/Front/HeroCollage';
import KeyNumbers from '@/components/Front/KeyNumbers';
import RecentRepatriations from '@/components/Front/RecentRepatriations';
import pinsJson from '@/content/pins.json';
import { getHeroImages } from '@/lib/commonsImages';
import { parsePins, selectFeatured } from '@/lib/featured';
import { keyNumbers, recentRepatriations } from '@/lib/frontPageStats';
import { getWikidataArtifacts } from '@/lib/getWikidataArtifacts';

export const dynamic = 'force-dynamic';

const linkClass = `text-gold underline hover:text-gold-dim ${FOCUS_RING}`;

export default async function Home() {
  // getHeroImages never throws; a Wikidata failure goes to Next's error handling.
  const [cards, heroImages] = await Promise.all([getWikidataArtifacts(), getHeroImages()]);
  const featured = selectFeatured(cards, parsePins(pinsJson));

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-6 sm:py-10">
      <HeroCollage featured={featured} heroImages={heroImages} />
      <KeyNumbers numbers={keyNumbers(cards)} />
      <FeaturedGrid featured={featured} />
      <RecentRepatriations cards={recentRepatriations(cards)} />
      <footer className="border-t border-navy-border pt-6 text-base text-parchment-dim">
        Data from{' '}
        <a href="https://www.wikidata.org/" className={linkClass}>
          Wikidata
        </a>{' '}
        (
        <a href="https://www.wikidata.org/wiki/Wikidata:Wikiproject_Looted_heritage" className={linkClass}>
          WikiProject Looted Heritage
        </a>
        ) and{' '}
        <a href="https://commons.wikimedia.org/" className={linkClass}>
          Wikimedia Commons
        </a>
        .
      </footer>
    </main>
  );
}
