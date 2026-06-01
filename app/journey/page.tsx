import type { Metadata } from 'next';
import ComingSoon from '@/components/Landing/ComingSoon';

export const metadata: Metadata = {
  title: 'The Journey — Battle of Magdala',
  description:
    'Prince Alemayehu’s path from the fortress of Magdala to the Red Sea, and across the sea to Victorian England.',
};

export default function JourneyPage() {
  return (
    <ComingSoon
      eyebrow="The Journey"
      title="From Magdala to England"
      description="Follow Prince Alemayehu’s path step by step — from his father’s fortress to the Red Sea coast, and across the sea to a strange new life in Victorian England."
    />
  );
}
