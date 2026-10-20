'use client';

import { useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { libraryArtifacts } from '@/lib/library';
import { useReviewSession } from '../ReviewMap/useReviewSession';
import ReviewMap from '../ReviewMap/index';
import LibraryGrid from '../Library/LibraryGrid';
import LibraryHeader from '../Library/LibraryHeader';
import ViewNav, { ViewTabs } from './ViewNav';
import { useViewUrl } from './useViewUrl';
import type { ViewId } from './views';

interface Props {
  artifacts: ArtifactCard[];
  initialView: ViewId;
  initialQid: string | null;
}

export default function StoryMap({ artifacts, initialView, initialQid }: Props) {
  const [activeView, setActiveView] = useState<ViewId>(initialView);
  // The session lives here, not in ReviewMap, so the selection survives switching Views.
  const [session, dispatch] = useReviewSession(artifacts, initialQid);
  useViewUrl(activeView, session.selected?.wpId ?? null);

  const library = libraryArtifacts(artifacts);

  return (
    <div className="md:pl-52">
      <ViewNav activeView={activeView} onSelectView={setActiveView} />
      {activeView === 'map' ? (
        <ReviewMap
          view={session}
          dispatch={dispatch}
          activeView={activeView}
          onSelectView={setActiveView}
        />
      ) : (
        <>
          <div className="md:hidden border-b border-navy-border bg-navy-light/80 p-3">
            <ViewTabs activeView={activeView} onSelectView={setActiveView} />
          </div>
          <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
              <LibraryHeader totalCount={library.length} />
              <LibraryGrid artifacts={library} />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
