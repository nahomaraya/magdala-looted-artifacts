import type { ArtifactCard } from '@/lib/types';
import type { MuseumGroup } from './reviewMapUtils';

export default function LeftRail({
  museumGroups,
  artifacts,
  selectedMuseum,
  onSelectMuseum,
}: {
  museumGroups: MuseumGroup[];
  artifacts: ArtifactCard[];
  selectedMuseum: string | null;
  onSelectMuseum: (name: string | null) => void;
}) {
  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-navy-border bg-navy overflow-y-auto">
      <div className="p-4 border-b border-navy-border">
        <h2 className="font-heading text-sm uppercase tracking-wide text-parchment">Holders</h2>
        <p className="text-xs text-parchment-dim mt-1">
          {museumGroups.length} institutions · {artifacts.length} artifacts
        </p>
      </div>

      <button
        type="button"
        onClick={() => onSelectMuseum(null)}
        className={`w-full text-left px-4 py-2 text-sm border-b border-navy-border/40 transition-colors ${
          selectedMuseum === null
            ? 'bg-blue-500/15 text-blue-200'
            : 'text-parchment hover:bg-navy-light/60'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">All artifacts</span>
          <span className="text-xs opacity-70">{artifacts.length}</span>
        </span>
      </button>

      {museumGroups.map((g) => {
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
      })}
    </aside>
  );
}
