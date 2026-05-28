'use client';
import type { ArtifactCard } from '@/lib/types';
import ArtifactMetadataGrid from './ArtifactMetadataGrid';

export default function ArtifactMetadata({ selected }: { selected: ArtifactCard }) {
  return (
    <div className="space-y-4">
      <ArtifactMetadataGrid selected={selected} />
    </div>
  );
}
