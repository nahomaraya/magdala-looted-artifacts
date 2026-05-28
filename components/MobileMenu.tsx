import type { ArtifactCard } from '@/lib/types';
import type { MuseumGroup } from './reviewMapUtils';

export default function MobileMenu({
  mobileMenuOpen,
  museumGroups,
  artifacts,
  onClose,
  onSelectMuseum,
}: {
  mobileMenuOpen: boolean;
  museumGroups: MuseumGroup[];
  artifacts: ArtifactCard[];
  onClose: () => void;
  onSelectMuseum: (name: string | null) => void;
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
          onClick={() => { onSelectMuseum(null); onClose(); }}
          className="w-full text-left px-4 py-2 text-sm rounded bg-navy/40 text-parchment"
        >
          All artifacts · {artifacts.length}
        </button>
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
