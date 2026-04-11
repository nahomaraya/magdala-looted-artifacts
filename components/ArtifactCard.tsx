'use client';

import Image from 'next/image';
import type { Artifact } from '@/lib/types';

interface Props {
  artifact: Artifact;
  selected: boolean;
  onClick: () => void;
}

const EVENT_COLORS: Record<string, string> = {
  red: 'bg-[#e74c3c]/20 text-[#e74c3c] border border-[#e74c3c]/40',
  gold: 'bg-[#daa520]/20 text-[#daa520] border border-[#daa520]/40',
  neutral: 'bg-white/10 text-[#c8b89a] border border-white/20',
};

export function ArtifactCard({ artifact, selected, onClick }: Props) {
  const eventTags = Array.from(
    new Map(
      artifact.provenance.map((e) => [e.eventQID, { label: e.eventLabel, color: e.color }]),
    ).values(),
  );

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
        selected
          ? 'border-[#daa520] bg-[#daa520]/10'
          : 'border-[#2a2a45] bg-[#1a1a30] hover:border-[#daa520]/50 hover:bg-[#1a1a30]/80'
      }`}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-[#12121f] border border-[#2a2a45]">
          {artifact.imageUrl ? (
            <Image
              src={artifact.imageUrl}
              alt={artifact.label}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#2a2a45]">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-heading text-sm font-semibold text-[#f4ead5] leading-tight mb-1 truncate"
            title={artifact.label}
          >
            {artifact.label}
          </h3>

          {artifact.description && (
            <p className="text-xs text-[#c8b89a] line-clamp-2 leading-relaxed mb-2">
              {artifact.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Location badge */}
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#52b788]/20 text-[#52b788] border border-[#52b788]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#52b788]" />
              {artifact.currentLocation.name}
            </span>

            {/* Event type tags */}
            {eventTags.slice(0, 2).map((tag) => (
              <span
                key={tag.label}
                className={`text-xs px-2 py-0.5 rounded-full ${EVENT_COLORS[tag.color]}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
