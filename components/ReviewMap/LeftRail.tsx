import type { ArtifactCard } from '@/lib/types';
import type { MuseumGroup } from './reviewMapUtils';
import { UNKNOWN_HOLDER } from './reviewMapUtils';

export default function LeftRail({
  museumGroups,
  artifacts,
  selectedMuseum,
  selectedWpId,
  onSelectMuseum,
  onSelectArtifact,
}: {
  museumGroups: MuseumGroup[];
  artifacts: ArtifactCard[];
  selectedMuseum: string | null;
  selectedWpId: string | null;
  onSelectMuseum: (name: string | null) => void;
  onSelectArtifact: (wpId: string) => void;
}) {
  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-navy-border bg-navy overflow-y-auto">
      <div className="p-4 border-b border-navy-border">
        <h2 className="font-heading text-sm uppercase tracking-wide text-parchment">Holders</h2>
        <p className="text-xs text-parchment-dim mt-1">
          {museumGroups.length} institutions · {artifacts.length} artifacts
        </p>
      </div>

      {/* Removed 'All artifacts' entry per UX request */}

      {selectedMuseum ? (
        // When a museum is selected, show a back button and list its artifacts (highlighting weak-link items)
        <div>
          <div className="px-4 py-2 border-b border-navy-border/40">
            <button
              type="button"
              onClick={() => onSelectMuseum(null)}
              className="text-parchment hover:text-blue-200 text-sm flex items-center gap-2"
            >
              ← Back to holders
            </button>
          </div>
          <div className="divide-y divide-navy-border">
            {artifacts
              .filter((a) => (a.holder?.name ?? UNKNOWN_HOLDER) === selectedMuseum)
              .map((a) => {
                const isSelected = selectedWpId === a.wpId;
                return (
                  <button
                    key={a.wpId}
                    type="button"
                    onClick={() => onSelectArtifact(a.wpId)}
                    className={`w-full px-4 py-2 text-sm transition-colors flex items-center justify-between gap-2 text-left ${
                      isSelected
                        ? 'bg-blue-500/20 text-blue-100'
                        : a.weakLink
                          ? 'bg-gold/20 text-gold hover:bg-gold/30'
                          : 'text-parchment hover:bg-navy-light/60'
                    }`}
                    title={a.title}
                  >
                    <span className="truncate">{a.title}</span>
                    <span className="shrink-0 text-xs opacity-70">{a.dedup?.exists ? 'dup' : ''}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ) : (
        museumGroups.map((g) => {
          const isSelected = selectedMuseum === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => onSelectMuseum(g.key)}
              className={`w-full text-left px-4 py-2 text-sm border-b border-navy-border/40 transition-colors ${
                isSelected
                  ? 'bg-blue-500/15 text-blue-200'
                  : 'text-parchment hover:bg-navy-light/60'
              }`}
              title={g.qid ? `${g.name} (${g.qid})` : g.name}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{g.name}</span>
                <span className="shrink-0 text-xs opacity-70">{g.count}</span>
              </div>
              {g.qid && (
                <span className="block text-[10px] font-mono text-parchment-dim mt-0.5">{g.qid}</span>
              )}
            </button>
          );
        })
      )}
    </aside>
  );
}
