'use client';
import type { ArtifactCard } from '@/lib/types';
import ArtifactMetadataCard from './ArtifactMetadataCard';
import ArtifactCategoriesCard from './ArtifactCategoriesCard';

export default function ArtifactMetadataGrid({ selected }: { selected: ArtifactCard }) {
  return (
    <div className="grid gap-3 text-base sm:grid-cols-2">
      <ArtifactMetadataCard
        label="Holder"
        value={selected.holder ? `${selected.holder.name ?? 'Unresolved'}${selected.holder.qid ? ` (${selected.holder.qid})` : ''}` : 'Unresolved'}
      />
      <ArtifactMetadataCard
        label="Primary category"
        value={selected.primaryCategory ? `${selected.primaryCategory.name ?? 'Unresolved'}${selected.primaryCategory.qid ? ` (${selected.primaryCategory.qid})` : ''}` : 'Unresolved'}
      />
      <ArtifactMetadataCard label="Maqdala confidence" value={selected.maqdalaConfidence ?? null} />
      <ArtifactCategoriesCard categories={selected.allCategories} />
    </div>
  );
}
