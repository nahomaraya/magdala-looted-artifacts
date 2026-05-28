interface LibraryDescriptionToggleProps {
  description?: string;
}

export default function LibraryDescriptionToggle({ description }: LibraryDescriptionToggleProps) {
  return (
    <details className="group rounded-2xl border border-navy-border/80 bg-navy-light/75 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
      <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-gold transition hover:bg-white/5 group-open:border-b group-open:border-navy-border/70">
        <span className="flex items-center justify-between gap-3">
          <span>Description</span>
          <span className="text-gold-dim transition group-open:rotate-180">v</span>
        </span>
      </summary>
      <div className="border-t border-navy-border/70 px-5 py-4 text-sm leading-7 text-parchment-dim">
        {description ? description : 'Add the collection description here when you are ready.'}
      </div>
    </details>
  );
}