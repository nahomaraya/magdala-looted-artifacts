import Link from 'next/link';
import type { ArtifactCard } from '@/lib/types';
import { presentation } from '../Artifact/presentation';
import type { ReviewWikidataHit } from './reviewMapUtils';

export default function MobileHeader({ selected, hits, onToggleMenu, onOpenDetails, onNext, onPrev }: {
  selected: ArtifactCard | null;
  hits: Record<string, ReviewWikidataHit>;
  onToggleMenu: () => void;
  onOpenDetails: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="md:hidden w-full border-b border-navy-border bg-navy-light/80 p-3 flex items-center gap-3">
      <button
        aria-label="Open museums"
        onClick={onToggleMenu}
        className="rounded px-2 py-1 text-parchment-dim hover:bg-navy/50"
      >
        <span className="text-2xl leading-none">≡</span>
      </button>

      <h1 className="font-heading text-lg text-parchment truncate flex-1">
        {selected ? presentation(selected, hits).title : 'No artifact selected.'}
      </h1>

      <div className="flex items-center gap-2">
        <Link
          href="/library"
          className="rounded border border-gold/60 bg-gold px-3 py-1 text-sm font-semibold text-navy hover:bg-gold-light"
        >
          View library
        </Link>
        <button
          type="button"
          onClick={onOpenDetails}
          className="rounded border border-parchment-dim/30 bg-navy px-3 py-1 text-sm text-parchment hover:bg-navy/60"
        >
          View details
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded border border-blue-300/60 bg-blue-500/15 px-3 py-1 text-sm font-medium text-blue-100 hover:bg-blue-500/25"
        >
          Next artifact
        </button>
        <button
          type="button"
          onClick={onPrev}
          className="rounded border border-parchment-dim/30 bg-navy px-3 py-1 text-sm text-parchment hover:bg-navy/60"
        >
          Previous artifact
        </button>
      </div>
    </div>
  );
}
