import { redirect } from 'next/navigation';
import { mapHref } from '@/components/StoryMap/views';

export const dynamic = 'force-dynamic';

export default function LootedLibraryRedirectPage() {
  redirect(mapHref('library', null));
}
