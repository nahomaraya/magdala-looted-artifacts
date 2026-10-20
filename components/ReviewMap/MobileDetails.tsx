import Image from 'next/image';
import type { ArtifactCard } from '@/lib/types';

export default function MobileDetails({
  mobileDetailsOpen,
  selected,
  previewTitle,
  previewImage,
  selectedIndex,
  count,
  selectedHolder,
  onClose,
  onNext,
  onPrev,
}: {
  mobileDetailsOpen: boolean;
  selected: ArtifactCard | null;
  previewTitle: string | null;
  previewImage: string | undefined;
  selectedIndex: number;
  count: number;
  selectedHolder: string | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  if (!mobileDetailsOpen) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 overflow-auto bg-navy/95 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl text-parchment">Details</h2>
        <div className="flex items-center gap-2">
          <button aria-label="Close details" onClick={onClose} className="text-parchment-dim px-2 py-1">Close</button>
        </div>
      </div>

      {!selected ? (
        <div className="text-parchment-dim">No artifact selected.</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-navy-border/70 bg-navy/70 px-4 py-4">
            <h3 className="font-heading text-2xl text-parchment truncate">{previewTitle ?? selected.title}</h3>
            <p className="text-sm text-parchment-dim mt-1">WP #{selected.wpId} · {selectedIndex + 1} / {count}{selectedHolder && <span className="ml-1 opacity-70"> in {selectedHolder}</span>}</p>
          </div>

          {previewImage && previewTitle && (
            <div className="relative h-56 rounded border border-navy-border overflow-hidden bg-navy">
              <Image src={previewImage} alt={previewTitle} fill className="object-contain" unoptimized />
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onNext} className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment hover:bg-navy/60">Next artifact</button>
            <button type="button" onClick={onPrev} className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment hover:bg-navy/60">Previous artifact</button>
            <button type="button" onClick={() => { onClose(); }} className="rounded border border-parchment-dim/30 bg-navy px-4 py-2 text-base text-parchment">Close</button>
          </div>

          <div className="grid gap-3 text-base">
            <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
              <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Holder</span>
              <span className="mt-1 block text-parchment">{selected.holder?.name ?? 'Unresolved'}{selected.holder?.qid ? ` (${selected.holder.qid})` : ''}</span>
            </p>
            <p className="rounded border border-navy-border/60 bg-navy/40 px-4 py-3 text-parchment-dim">
              <span className="block text-sm uppercase tracking-wide text-parchment-dim/80">Primary category</span>
              <span className="mt-1 block text-parchment">{selected.primaryCategory?.name ?? 'Unresolved'}{selected.primaryCategory?.qid ? ` (${selected.primaryCategory.qid})` : ''}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
