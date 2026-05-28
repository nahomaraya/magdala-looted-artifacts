"use client";
import React, { useMemo, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import LibraryArtifactCard from './LibraryArtifactCard';

interface LibraryGridProps {
  artifacts: ArtifactCard[];
}

const DEFAULT_PER_PAGE = 6;

export default function LibraryGrid({ artifacts }: LibraryGridProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const total = artifacts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const pageArtifacts = useMemo(() => {
    const start = (page - 1) * perPage;
    return artifacts.slice(start, start + perPage);
  }, [artifacts, page, perPage]);

  if (total === 0) {
    return (
      <div className="rounded-3xl border border-navy-border/80 bg-navy-light/70 px-6 py-10 text-center text-parchment-dim shadow-[0_18px_60px_rgba(0,0,0,0.2)]">
        No manuscripts or books matched the current filters.
      </div>
    );
  }

  function goTo(newPage: number) {
    setPage(Math.min(Math.max(1, newPage), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {pageArtifacts.map((artifact) => (
          <LibraryArtifactCard key={artifact.wpId} artifact={artifact} />
        ))}
      </div>

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
    </div>
  );
}