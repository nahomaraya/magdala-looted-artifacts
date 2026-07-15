import type { Metadata } from 'next';
import { getLibraryArtifacts } from '@/lib/getLibraryArtifacts';
import LibraryGrid from '@/components/Library/LibraryGrid';
import LibraryHeader from '@/components/Library/LibraryHeader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Looted Library | Looted Artifacts',
  description: 'A digital library of looted manuscripts and books with embedded primary source previews.',
};

export default async function LibraryPage() {
  const artifacts = await getLibraryArtifacts();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <LibraryHeader totalCount={artifacts.length} />
        <LibraryGrid artifacts={artifacts} />
      </div>
    </main>
  );
}
