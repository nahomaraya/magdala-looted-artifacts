 'use client';
import type { ArtifactCard } from '@/lib/types';
import ArtifactHeader from './ArtifactHeader';
import ArtifactActions from './ArtifactActions';
import ArtifactMetadata from './ArtifactMetadata';
import ProvenanceReferences from './ProvenanceReferences';

type ArtifactPaneProps = {
  selected: ArtifactCard | null;
  previewTitle?: string | null;
  selectedIndex: number;
  filteredArtifacts: ArtifactCard[];
  selectedMuseum: string | null;
  previewImage?: string | undefined;
  primarySource: string | null;
  wikidataUrl: string | null;
  handleNextArtifact: () => void;
  handlePreviousArtifact: () => void;
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
  /** 1024–1279px only: pane slid away to widen the map. Ignored at xl. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function ArtifactPane({
  selected,
  previewTitle,
  selectedIndex,
  filteredArtifacts,
  selectedMuseum,
  previewImage,
  primarySource,
  wikidataUrl,
  handleNextArtifact,
  handlePreviousArtifact,
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
  collapsed = false,
  onToggleCollapsed,
}: ArtifactPaneProps) {
  return (
    <aside
      className={`${
        collapsed ? 'hidden xl:block' : 'hidden lg:block'
      } relative w-105 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto`}
    >
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Hide artifact pane"
          title="Hide artifact pane"
          className="xl:hidden absolute right-2 top-2 z-10 rounded px-2 py-1 text-parchment-dim hover:bg-navy/60"
        >
          »
        </button>
      )}
      {!selected ? (
        <div className="p-6 text-base text-parchment-dim">No artifact selected.</div>
      ) : (
        <div className="p-6 xl:p-8 space-y-6">
          <ArtifactHeader
            selected={selected}
            previewTitle={previewTitle}
            selectedIndex={selectedIndex}
            filteredArtifacts={filteredArtifacts}
            selectedMuseum={selectedMuseum}
            previewImage={previewImage}
          />

          <ArtifactActions
            primarySource={primarySource}
            wikidataUrl={wikidataUrl}
            handleNextArtifact={handleNextArtifact}
            handlePreviousArtifact={handlePreviousArtifact}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <ArtifactMetadata selected={selected} />
            </div>

            <div className="space-y-4">
              <ProvenanceReferences
                selected={selected}
                takenFromLabel={takenFromLabel}
                currentLocationLabel={currentLocationLabel}
                responsibleLabel={responsibleLabel}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
