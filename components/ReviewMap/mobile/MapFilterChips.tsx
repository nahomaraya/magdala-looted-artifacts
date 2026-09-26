export default function MapFilterChips({
  showReturnedOnly,
  onToggleReturnedOnly,
  returnedCount,
  showWeakLinkArtifacts,
  onToggleWeakLinkArtifacts,
}: {
  showReturnedOnly: boolean;
  onToggleReturnedOnly: () => void;
  returnedCount: number;
  showWeakLinkArtifacts: boolean;
  onToggleWeakLinkArtifacts: () => void;
}) {
  const chip =
    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium shadow backdrop-blur-sm transition-colors disabled:opacity-50';
  return (
    <div className="lg:hidden absolute inset-x-2 top-2 z-1000 flex gap-2 overflow-x-auto">
      <button
        type="button"
        aria-pressed={showReturnedOnly}
        onClick={onToggleReturnedOnly}
        disabled={returnedCount === 0}
        className={`${chip} ${
          showReturnedOnly
            ? 'border-emerald-400/60 bg-emerald-500/80 text-white'
            : 'border-navy-border bg-navy/80 text-parchment'
        }`}
      >
        Returned to Ethiopia ({returnedCount})
      </button>
      <button
        type="button"
        aria-pressed={showWeakLinkArtifacts}
        onClick={onToggleWeakLinkArtifacts}
        disabled={showReturnedOnly}
        className={`${chip} ${
          showWeakLinkArtifacts
            ? 'border-blue-300/60 bg-blue-500/80 text-white'
            : 'border-navy-border bg-navy/80 text-parchment'
        }`}
      >
        Weak links
      </button>
    </div>
  );
}
