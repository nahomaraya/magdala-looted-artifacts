import { redirect } from 'next/navigation';
import { mapHref } from '@/components/StoryMap/views';

export const dynamic = 'force-dynamic';

// Stand-in until the landing page replaces it.
export default function Home() {
  redirect(mapHref('map', null));
}
