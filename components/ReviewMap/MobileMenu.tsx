import type { ArtifactCard } from '@/lib/types';
import type { MuseumGroup } from './reviewMapUtils';

export default function MobileMenu({
  mobileMenuOpen,
  museumGroups,
  artifacts,
  onClose,
  onSelectMuseum,
  showWeakLinkArtifacts,
  onToggleWeakLinkArtifacts,
  showReturnedOnly,
  onToggleReturnedOnly,
  returnedCount,
}: {
  mobileMenuOpen: boolean;
  museumGroups: MuseumGroup[];
  artifacts: ArtifactCard[];
  onClose: () => void;
  onSelectMuseum: (name: string | null) => void;
  showWeakLinkArtifacts: boolean;
  onToggleWeakLinkArtifacts: () => void;
  showReturnedOnly: boolean;
  onToggleReturnedOnly: () => void;
  returnedCount: number;
}) {
  if (!mobileMenuOpen) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 overflow-auto bg-navy/95 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl text-parchment">Holders</h2>
        <button aria-label="Close menu" onClick={onClose} className="text-parchment-dim px-2 py-1">✕</button>
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => { onToggleReturnedOnly(); onClose(); }}
          disabled={returnedCount === 0}
          className={`w-full text-left px-4 py-2 text-sm rounded disabled:opacity-50 ${
            showReturnedOnly ? 'bg-emerald-500/15 text-emerald-200' : 'bg-navy/30 text-parchment'
          }`}
        >
          {showReturnedOnly ? 'Show all objects' : `Returned to Ethiopia (${returnedCount})`}
        </button>
        <button
          type="button"
          onClick={() => { onToggleWeakLinkArtifacts(); onClose(); }}
          disabled={showReturnedOnly}
          className={`w-full text-left px-4 py-2 text-sm rounded disabled:opacity-50 ${
            showWeakLinkArtifacts ? 'bg-blue-500/15 text-blue-200' : 'bg-navy/30 text-parchment'
          }`}
        >
          {showWeakLinkArtifacts ? 'Hide weak link objects' : 'Show weak link objects'}
        </button>
        {/* Removed 'All artifacts' option per UX request */}
        {museumGroups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => { onSelectMuseum(g.key); onClose(); }}
            className="w-full text-left px-4 py-2 text-sm rounded bg-navy/30 text-parchment"
            title={g.qid ? `${g.name} (${g.qid})` : g.name}
          >
            <div className="flex items-center justify-between">
              <span className="truncate">{g.name}</span>
              <span className="text-xs opacity-70">{g.count}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
