import type { MuseumGroup } from '../reviewMapUtils';

export default function SheetHoldersList({
  museumGroups,
  onOpenHolder,
}: {
  museumGroups: MuseumGroup[];
  onOpenHolder: (holderKey: string) => void;
}) {
  return (
    <ul className="divide-y divide-navy-border/60">
      {museumGroups.map((g) => (
        <li key={g.key}>
          <button
            type="button"
            onClick={() => onOpenHolder(g.key)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-base text-parchment active:bg-navy-light/60"
          >
            <span className="truncate">{g.name}</span>
            <span className="shrink-0 text-sm text-parchment-dim">{g.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
