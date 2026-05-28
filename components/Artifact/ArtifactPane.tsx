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
  handleNextArtifact: () => void;
  handlePreviousArtifact: () => void;
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
};

export function ArtifactPane({
  selected,
  previewTitle,
  selectedIndex,
  filteredArtifacts,
  selectedMuseum,
  previewImage,
  primarySource,
  handleNextArtifact,
  handlePreviousArtifact,
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
}: ArtifactPaneProps) {
  return (
    <aside className="hidden md:block w-185 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
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
