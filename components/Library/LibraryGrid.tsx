"use client";
import React, { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { buildBookTypeBuckets, classifyBookType } from '@/lib/libraryBookTypes';
import LibraryArtifactCard from './LibraryArtifactCard';

interface LibraryGridProps {
  artifacts: ArtifactCard[];
}

const DEFAULT_PER_PAGE = 6;
const ALL_TYPES = 'all';

export default function LibraryGrid({ artifacts }: LibraryGridProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [activeType, setActiveType] = useState<string>(ALL_TYPES);

  // Classify once; buckets drive the filter bar, the per-artifact badge reuses
  // the same classifier so the two never drift apart.
  const buckets = useMemo(() => buildBookTypeBuckets(artifacts), [artifacts]);
  const typeById = useMemo(
    () => new Map(artifacts.map((a) => [a.wpId, classifyBookType(a)])),
    [artifacts],
  );

  const filtered = useMemo(() => {
    if (activeType === ALL_TYPES) return artifacts;
    return artifacts.filter((a) => typeById.get(a.wpId)?.id === activeType);
  }, [artifacts, typeById, activeType]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const pageArtifacts = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  function selectType(id: string) {
    setActiveType(id);
    setPage(1);
  }

  function goTo(newPage: number) {
    setPage(Math.min(Math.max(1, newPage), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filterBar = buckets.length > 1 && (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by book type">
      <FilterChip
        label="All"
        count={artifacts.length}
        active={activeType === ALL_TYPES}
        onClick={() => selectType(ALL_TYPES)}
      />
      {buckets.map((bucket) => (
        <FilterChip
          key={bucket.id}
          label={bucket.label}
          count={bucket.count}
          title={bucket.blurb}
          active={activeType === bucket.id}
          onClick={() => selectType(bucket.id)}
        />
      ))}
    </div>
  );

  if (artifacts.length === 0) {
    return (
      <div className="rounded-3xl border border-navy-border/80 bg-navy-light/70 px-6 py-10 text-center text-parchment-dim shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
        No manuscripts or books matched the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filterBar}

      {total === 0 ? (
        <div className="rounded-3xl border border-navy-border/80 bg-navy-light/70 px-6 py-10 text-center text-parchment-dim shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
          No items in this category.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {pageArtifacts.map((artifact) => (
            <LibraryArtifactCard
              key={artifact.wpId}
              artifact={artifact}
              bookType={typeById.get(artifact.wpId)}
            />
          ))}
        </div>
      )}

      {total > 0 && (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="rounded border border-navy-border/60 bg-navy px-3 py-2 text-sm text-parchment-dim disabled:opacity-40"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            className="rounded border border-navy-border/60 bg-navy px-3 py-2 text-sm text-parchment-dim disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-parchment-dim">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => goTo(Number(e.target.value || 1))}
            className="w-16 rounded border border-navy-border/60 bg-navy px-2 py-1 text-sm text-parchment"
          />
          <span className="text-sm text-parchment-dim">/ {totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-parchment-dim">Per page</label>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="rounded border border-navy-border/60 bg-navy px-2 py-1 text-sm text-parchment"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={18}>18</option>
          </select>
        </div>
      </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  title?: string;
}

function FilterChip({ label, count, active, onClick, title }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-gold/60 bg-gold/15 text-gold'
          : 'border-navy-border/70 bg-navy-light/60 text-parchment-dim hover:border-gold/40 hover:text-parchment'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
          active ? 'bg-gold/25 text-gold' : 'bg-white/10 text-parchment-dim'
        }`}
      >
        {count}
      </span>
    </button>
  );
}