'use client';
import type { ArtifactCard } from '@/lib/types';
import type { ReviewWikidataHit } from '../ReviewMap/reviewMapUtils';
import { presentation } from './presentation';
import ArtifactHeader from './ArtifactHeader';
import ArtifactActions from './ArtifactActions';
import ArtifactMetadata from './ArtifactMetadata';
import ProvenanceReferences from './ProvenanceReferences';

type ArtifactPaneProps = {
  selected: ArtifactCard | null;
  hits: Record<string, ReviewWikidataHit>;
  position: { index: number; count: number; holder: string | null };
  onNext: () => void;
  onPrev: () => void;
};

export function ArtifactPane({ selected, hits, position, onNext, onPrev }: ArtifactPaneProps) {
  if (!selected) {
    return (
      <aside className="hidden md:block w-185 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
        <div className="p-6 text-base text-parchment-dim">No artifact selected.</div>
      </aside>
    );
  }

  const p = presentation(selected, hits);

  return (
    <aside className="hidden md:block w-185 xl:w-184 shrink-0 border-l border-navy-border bg-navy-light/80 backdrop-blur-sm overflow-y-auto">
      <div className="p-6 xl:p-8 space-y-6">
        <ArtifactHeader selected={selected} presentation={p} position={position} />
        <ArtifactActions presentation={p} onNext={onNext} onPrev={onPrev} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <ArtifactMetadata selected={selected} />
          </div>
          <div className="space-y-4">
            <ProvenanceReferences selected={selected} presentation={p} />
          </div>
        </div>
      </div>
    </aside>
  );
}
