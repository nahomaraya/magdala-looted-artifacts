'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { DetailPanel } from './DetailPanel';
import type { Artifact } from '@/lib/types';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface ApiResponse {
  artifacts: Artifact[];
  count: number;
}

async function fetchArtifacts(): Promise<ApiResponse> {
  const res = await fetch('/api/artifacts');
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 600;

export function ArtifactExplorer() {
  const [selectedQID, setSelectedQID] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(370);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['artifacts'],
    queryFn: fetchArtifacts,
  });

  const artifacts = data?.artifacts ?? [];
  const selectedArtifact = artifacts.find((a) => a.qid === selectedQID) ?? null;

  const handleSelect = useCallback((qid: string | null) => setSelectedQID(qid), []);
  const handleClose = useCallback(() => setSelectedQID(null), []);

  const startSidebarDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW + ev.clientX - startX)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const uniqueLocations = new Set(artifacts.map((a) => a.currentLocation.name)).size;
  const dataSource = artifacts[0]?.dataSource;

  return (
    <div className="flex flex-col h-screen bg-[#1a0e06]">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#4a2c0e] bg-[#1a0e06] z-10">
        <div>
          <h1 className="font-heading text-lg font-bold text-[#f4ead5] leading-tight">
            Battle of Magdala
          </h1>
          <p className="text-xs text-[#c8b89a] leading-tight">
            Looted Artifacts — 1868
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!isLoading && !isError && artifacts.length > 0 && (
            <>
              <span className="text-xs text-[#c8b89a]">
                <span className="text-[#f4ead5] font-semibold">{artifacts.length}</span> artifacts
              </span>
              <span className="text-xs text-[#c8b89a]">
                <span className="text-[#f4ead5] font-semibold">{uniqueLocations}</span> institutions
              </span>
            </>
          )}

          {dataSource === 'fallback' ? (
            <span className="px-2 py-1 text-xs rounded border border-[#daa520]/50 text-[#daa520]">
              Curated data
            </span>
          ) : dataSource === 'sparql' ? (
            <span className="px-2 py-1 text-xs rounded border border-[#52b788]/50 text-[#52b788]">
              Live Wikidata
            </span>
          ) : null}

          <a
            href="https://www.wikidata.org/wiki/Q947667"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#c8b89a] hover:text-[#daa520] transition-colors"
          >
            About ↗
          </a>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar + drag handle */}
        <div className="relative flex-shrink-0 h-full overflow-hidden" style={{ width: sidebarWidth }}>
          <Sidebar
            artifacts={artifacts}
            selectedQID={selectedQID}
            onSelect={handleSelect}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            dataSource={dataSource}
          />
          {/* Right-edge drag handle */}
          <div
            onMouseDown={startSidebarDrag}
            className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize group z-20"
          >
            <div className="h-full w-full bg-[#4a2c0e] group-hover:bg-[#daa520]/60 transition-colors" />
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 relative h-full overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a0e06]">
              <div className="text-center">
                <div className="spinner mx-auto mb-4" />
                <p className="text-sm text-[#c8b89a]">Loading map data…</p>
              </div>
            </div>
          ) : (
            <MapView
              artifacts={artifacts}
              selectedQID={selectedQID}
              onSelectArtifact={handleSelect}
            />
          )}

          {selectedArtifact && (
            <DetailPanel artifact={selectedArtifact} onClose={handleClose} />
          )}
        </div>
      </div>
    </div>
  );
}
