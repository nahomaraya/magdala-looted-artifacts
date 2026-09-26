'use client';

export default function ProvenanceSummary({
  takenFromLabel,
  currentLocationLabel,
  responsibleLabel,
}: {
  takenFromLabel: string;
  currentLocationLabel: string;
  responsibleLabel: string | null;
}) {
  return (
    <div className="rounded border border-navy-border/70 bg-navy/60 px-4 py-4 text-base text-parchment-dim">
      <p className="text-parchment text-lg font-medium">Provenance</p>
      <div className="mt-3 space-y-2">
        <p>
          <span className="text-parchment">Taken from:</span> {takenFromLabel}
        </p>
        <p>
          <span className="text-parchment">Current location:</span> {currentLocationLabel}
        </p>
        {responsibleLabel && (
          <p>
            <span className="text-parchment">Responsible institution:</span> {responsibleLabel}
          </p>
        )}
      </div>
    </div>
  );
}
