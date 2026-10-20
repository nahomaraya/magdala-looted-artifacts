"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { ArtifactCard } from '@/lib/types';
import { classifyBookType, type BookType } from '@/lib/libraryBookTypes';
import { checkCanEmbed } from '@/app/actions/check-iframe'; // <-- Adjust path as needed

interface LibraryArtifactCardProps {
  artifact: ArtifactCard;
  /** Primary book type. Falls back to deriving it when not supplied. */
  bookType?: BookType;
  /** Switches to the Dispersal View with this artifact selected. */
  onShowInMap: (qid: string) => void;
}

export default function LibraryArtifactCard({ artifact, bookType, onShowInMap }: LibraryArtifactCardProps) {
  const type = bookType ?? classifyBookType(artifact);
  const primarySource = artifact.sourceLinks[0] ?? artifact.url;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const iframeLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    setTimeout(() => {
      if (!isMounted) return;
      iframeLoadedRef.current = false;
      setIframeLoaded(false);
      setIframeFailed(false);
    }, 0);

    // 1. Immediately check if the URL allows embedding via the server action
    checkCanEmbed(primarySource).then((canEmbed) => {
      if (!isMounted) return;
      
      if (!canEmbed) {
        setIframeFailed(true);
        // Clear timeout since we already know it failed
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      }
    });

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // 2. Fallback timeout for sites that allow embedding but are painfully slow/hanging
    timeoutRef.current = window.setTimeout(() => {
      if (!iframeLoadedRef.current && isMounted) {
        setIframeFailed(true);
      }
    }, 6000);

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [primarySource]);

  const onLoad = () => {
    // Only set to loaded if we haven't already marked it as failed via the server check
    if (!iframeFailed) {
      iframeLoadedRef.current = true;
      setIframeLoaded(true);
    }
    
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const onError = () => {
    // This will still catch generic network errors if the browser allows it to fire
    setIframeFailed(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const placeholder = '/library-placeholder.jpg';

  return (
    <article className="group overflow-hidden rounded-3xl border border-navy-border/80 bg-navy-light/80 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_30px_80px_rgba(0,0,0,0.36)]">
      <div className="border-b border-navy-border/70 px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-gold-dim/80">Primary source</p>
          <span
            title={type.blurb}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${type.badgeClass}`}
          >
            {type.label}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <h2 className="text-xl font-semibold leading-snug text-parchment sm:text-2xl">{artifact.title}</h2>
          <button
            type="button"
            onClick={() => onShowInMap(artifact.wpId)}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/35 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:border-blue-400/60 hover:bg-blue-400/20"
          >
            Show in map
            <span aria-hidden="true">↗</span>
          </button>
          <a
            href={primarySource}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition hover:border-gold/60 hover:bg-gold/20"
          >
            Open primary source
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <div className="relative bg-navy/80">
        {(!iframeLoaded || iframeFailed) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-navy-light/80">
            <img src={placeholder} alt={`Preview for ${artifact.title}`} className="h-full w-full object-cover" />
          </div>
        )}

        {/* Only attempt to render the iframe if we haven't explicitly failed the header check */}
        {!iframeFailed && (
          <iframe
            title={`Primary source preview for ${artifact.title}`}
            src={primarySource}
            loading="lazy"
            onLoad={onLoad}
            onError={onError}
            className="h-124 w-full border-0 bg-navy-light"
          />
        )}
      </div>
    </article>
  );
}