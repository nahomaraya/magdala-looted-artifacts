'use client';

type ArtifactMetadataCardProps = {
  label: string;
  value: string | null | undefined;
};

export default function ArtifactMetadataCard({ label, value }: ArtifactMetadataCardProps) {
  if (!value) return null;

  return (
    <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
      <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">{label}</span>
      <span className="mt-1 block text-parchment">{value}</span>
    </p>
  );
}
