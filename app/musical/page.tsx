import type { Metadata } from 'next';
import ComingSoon from '@/components/Landing/ComingSoon';

export const metadata: Metadata = {
  title: 'The Musical — Battle of Magdala',
  description: 'A stage retelling of the prince and the plunder.',
};

export default function MusicalPage() {
  return (
    <ComingSoon
      eyebrow="The Musical"
      title="The Prince & The Plunder, On Stage"
      description="A stage retelling of the prince and the plunder — the music, the cast and the story behind the production."
    />
  );
}
