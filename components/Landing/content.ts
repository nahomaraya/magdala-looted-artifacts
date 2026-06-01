/**
 * Static editorial content for the landing page.
 *
 * Images are intentionally optional. Drop real files into `public/images/...`
 * and set the matching `image` field; until then the <Figure> component renders
 * a styled sepia placeholder using `imageAlt` as its caption.
 */

export interface HeroContent {
  kicker: string;
  title: string;
  lifespan: string;
  lead: string;
  image?: string;
  imageAlt: string;
}

export const hero: HeroContent = {
  kicker: 'The Prince & The Plunder',
  title: 'Prince Alemayehu',
  lifespan: '1861 — 1879',
  lead:
    'The orphaned son of Emperor Tewodros II, taken from his homeland at the age of seven after the fall of Magdala. He charmed Queen Victoria, was tutored alongside the children of empire, and was never allowed to go home. He died a stranger in England at eighteen.',
  imageAlt: 'Portrait of Prince Alemayehu Tewodros of Ethiopia',
};

export interface StoryParagraph {
  text: string;
}

export const story: {
  heading: string;
  intro: string;
  paragraphs: StoryParagraph[];
  image?: string;
  imageAlt: string;
} = {
  heading: 'A Boy Between Two Empires',
  intro:
    'When British troops stormed his father’s mountain fortress in 1868, they freed European prisoners, seized piles of treasure and sacred manuscripts — and carried away a grieving child.',
  paragraphs: [
    {
      text: 'Alemayehu Tewodros was born in 1861, the son of Emperor Tewodros II of Ethiopia and Empress Tiruwork Wube. He was raised inside the citadel of Magdala, his father’s last stronghold, during years when the emperor’s dream of a unified, modern Ethiopia was collapsing into isolation and war.',
    },
    {
      text: 'After Tewodros took his own life at the fall of Magdala, the seven-year-old prince and his mother were taken by the departing British army. His mother, Empress Tiruwork, died on the long march to the Red Sea coast. Alemayehu sailed on to England in the care of Captain Tristram Speedy, a towering, red-bearded soldier who became his guardian.',
    },
    {
      text: 'In Britain he was a celebrity and a curiosity. He met Queen Victoria at Osborne House, who recorded her affection for him in her diary; he spoke with the poet Tennyson and was photographed by the era’s finest studios. He was schooled at Cheltenham, Rugby and finally the military college at Sandhurst — admired, displayed, and profoundly alone.',
    },
    {
      text: 'He died of pleurisy in Leeds in 1879, aged just eighteen. At Queen Victoria’s request he was buried at St George’s Chapel, Windsor Castle, beneath a brass plaque reading “I was a stranger and ye took me in.” Ethiopia has asked, again and again, for his remains — and for the treasures taken with him — to come home.',
    },
  ],
  imageAlt: 'Prince Alemayehu with his guardian Captain Tristram Speedy',
};

export interface TimelineEvent {
  /** Display index, e.g. "01". */
  index: string;
  date: string;
  title: string;
  body: string;
  image?: string;
  imageAlt: string;
}

/** The Battle of Magdala, in chronological order. */
export const timeline: TimelineEvent[] = [
  {
    index: '01',
    date: '1855',
    title: 'A New Emperor',
    body:
      'Tewodros II is crowned Emperor of Ethiopia. Ambitious and reform-minded, he sets out to unify a fractured country and modernise its army, looking to Europe for allies and engineers.',
    imageAlt: 'Emperor Tewodros II of Ethiopia',
  },
  {
    index: '02',
    date: '1862',
    title: 'A Letter to the Queen',
    body:
      'Tewodros writes to Queen Victoria proposing an alliance against hostile neighbours. The letter is filed away in the Foreign Office and never answered — a silence the emperor takes as a grave insult.',
    imageAlt: 'Emperor Tewodros’s 1862 letter to Queen Victoria',
  },
  {
    index: '03',
    date: '1864',
    title: 'The Hostages',
    body:
      'Enraged by the lack of reply, Tewodros imprisons the British consul Captain Cameron and a group of European missionaries, holding them in the fortress of Magdala as leverage.',
    imageAlt: 'European captives held at Magdala',
  },
  {
    index: '04',
    date: '1866',
    title: 'Diplomacy Fails',
    body:
      'Britain sends the envoy Hormuzd Rassam to negotiate the captives’ release. Rassam himself is detained, and the standoff hardens into a crisis the empire cannot ignore.',
    imageAlt: 'The envoy Hormuzd Rassam',
  },
  {
    index: '05',
    date: '1867',
    title: 'The Expedition',
    body:
      'Britain authorises a punitive expedition. Lieutenant-General Sir Robert Napier assembles a vast force — some 13,000 fighting men, 26,000 camp followers, and 44 elephants to haul the heavy guns.',
    imageAlt: 'Sir Robert Napier and the British expeditionary force',
  },
  {
    index: '06',
    date: 'January 1868',
    title: 'The March Inland',
    body:
      'The army lands at Zula on the Red Sea coast and begins an extraordinary march of some 400 miles, building roads and even a railway as it climbs into the Ethiopian highlands toward Magdala.',
    imageAlt: 'The British march from Zula into the highlands',
  },
  {
    index: '07',
    date: '10 April 1868',
    title: 'The Battle of Aroge',
    body:
      'On Good Friday, Ethiopian warriors charge the British line on the Aroge plain below the fortress. Snider breech-loading rifles and rockets cut them down: roughly 700 are killed and 1,200 wounded.',
    imageAlt: 'The Battle of Aroge below Magdala',
  },
  {
    index: '08',
    date: '13 April 1868',
    title: 'The Fall of Magdala',
    body:
      'British troops storm the citadel. Rather than surrender, Emperor Tewodros takes his own life with a pistol — reputedly a gift once sent to him by Queen Victoria herself.',
    imageAlt: 'The storming of the Magdala fortress',
  },
  {
    index: '09',
    date: 'April 1868',
    title: 'The Plunder',
    body:
      'Soldiers strip the fortress of gold crowns, royal regalia, sacred tabots and around a thousand manuscripts, including copies of the Kebra Nagast. It takes 15 elephants and 200 mules to carry the loot away. The treasure is auctioned over two days; the fortress is burned.',
    imageAlt: 'Treasure carried away from Magdala on elephants and mules',
  },
  {
    index: '10',
    date: '1868',
    title: 'A Prince Taken',
    body:
      'Among those carried off is seven-year-old Prince Alemayehu, with his mother Empress Tiruwork. She dies on the journey to the coast, and the orphaned prince sails on alone to a life in England.',
    imageAlt: 'Prince Alemayehu taken from Ethiopia',
  },
  {
    index: '11',
    date: 'After 1868',
    title: 'Scattered Across the World',
    body:
      'The looted treasures enter the British Museum, the Victoria & Albert Museum, the British Library, and royal and private collections. More than 150 years later, most have never returned to Ethiopia.',
    imageAlt: 'Magdala treasures dispersed across world museums',
  },
];

export interface MenuItem {
  title: string;
  href: string;
  blurb: string;
  cta: string;
  /** Tailwind accent class applied to the marker/hover. */
  accent: 'gold' | 'looting' | 'location' | 'parchment';
  external?: boolean;
  comingSoon?: boolean;
}

export const menu: MenuItem[] = [
  {
    title: 'The Artifacts',
    href: '/review',
    blurb:
      'An interactive map tracing the looted objects of Magdala from the Ethiopian highlands to the institutions that hold them today.',
    cta: 'Open the map',
    accent: 'gold',
  },
  {
    title: 'The Library',
    href: '/library',
    blurb:
      'Browse the manuscripts, illuminated gospels and sacred books carried away from the fortress — and trace where each one rests.',
    cta: 'Enter the library',
    accent: 'parchment',
    comingSoon: true,
  },
  {
    title: 'The Journey',
    href: '/journey',
    blurb:
      'Follow Prince Alemayehu’s path step by step, from Magdala to the Red Sea, and across the sea to a strange life in Victorian England.',
    cta: 'Begin the journey',
    accent: 'location',
    comingSoon: true,
  },
  {
    title: 'The Musical',
    href: '/musical',
    blurb:
      'A stage retelling of the prince and the plunder — the music, the cast and the story behind the production.',
    cta: 'See the show',
    accent: 'looting',
    comingSoon: true,
  },
];
