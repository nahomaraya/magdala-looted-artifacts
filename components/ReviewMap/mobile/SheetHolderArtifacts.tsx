import type { ArtifactCard } from '@/lib/types';

export default function SheetHolderArtifacts({
  artifacts,
  onOpenArtifact,
}: {
  artifacts: ArtifactCard[];
  onOpenArtifact: (wpId: string) => void;
}) {
  if (artifacts.length === 0) {
    return <p className="px-4 py-6 text-sm text-parchment-dim">No artifacts from this holder are in view.</p>;
  }
  return (
    <ul className="divide-y divide-navy-border/60">
      {artifacts.map((a) => (
        <li key={a.wpId}>
          <button
            type="button"
            onClick={() => onOpenArtifact(a.wpId)}
            className={`w-full px-4 py-3 text-left text-base ${
              a.weakLink ? 'bg-gold/20 text-gold' : 'text-parchment active:bg-navy-light/60'
            }`}
          >
            <span className="line-clamp-2">{a.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
