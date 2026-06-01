import type { Metadata } from 'next';
import ComingSoon from '@/components/Landing/ComingSoon';

export const metadata: Metadata = {
  title: 'The Library — Battle of Magdala',
  description:
    'The manuscripts, illuminated gospels and sacred books carried away from the fortress of Magdala in 1868.',
};

export default function LibraryPage() {
  return (
    <ComingSoon
      eyebrow="The Library"
      title="The Manuscripts of Magdala"
      description="A catalogue of the manuscripts, illuminated gospels and sacred books carried away from the fortress — and the institutions that hold them today."
    />
  );
}
