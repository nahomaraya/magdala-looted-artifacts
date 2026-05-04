'use client';

import { ArtifactCard } from './ArtifactCard';
import type { Artifact } from '@/lib/types';

interface Props {
  artifacts: Artifact[];
  selectedQID: string | null;
  onSelect: (qid: string | null) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  dataSource?: string;
}

export function Sidebar({
  artifacts,
  selectedQID,
  onSelect,
  isLoading,
  isError,
  onRetry,
  dataSource,
}: Props) {
  const uniqueLocations = new Set(artifacts.map((a) => a.currentLocation.name)).size;

  return (
    <aside className="flex flex-col h-full bg-navy border-r border-navy-border">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-navy-border shrink-0">
        <h2 className="font-heading text-xs font-semibold uppercase tracking-widest text-[#daa520] mb-1">
          Artifacts
        </h2>
        {!isLoading && !isError && (
          <p className="text-xs text-parchment-dim">
            {artifacts.length} artifacts · {uniqueLocations} institution
            {uniqueLocations !== 1 ? 's' : ''}
            {dataSource === 'fallback' && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-[#daa520]/20 text-[#daa520] border border-[#daa520]/40">
                curated
              </span>
            )}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="spinner" />
            <p className="text-xs text-parchment-dim">Fetching from Wikidata…</p>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 px-4 text-center">
            <p className="text-sm text-looting">Failed to load artifacts.</p>
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded border border-[#daa520]/50 text-[#daa520] text-sm hover:bg-[#daa520]/10 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && artifacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 px-4 text-center">
            <p className="text-sm text-parchment-dim">No artifacts found.</p>
          </div>
        )}

        {!isLoading && !isError && artifacts.length > 0 && (
          <div className="p-3 flex flex-col gap-2">
            {artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.qid}
                artifact={artifact}
                selected={selectedQID === artifact.qid}
                onClick={() =>
                  onSelect(selectedQID === artifact.qid ? null : artifact.qid)
                }
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
