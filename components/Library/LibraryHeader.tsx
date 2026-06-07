import LibraryDescriptionToggle from './LibraryDescriptionToggle';

interface LibraryHeaderProps {
  totalCount: number;
}

export default function LibraryHeader({ totalCount }: LibraryHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-gold-dim/90">Digital collection</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-parchment sm:text-5xl lg:text-6xl">
              Looted Library
            </h1>
            <p className="max-w-3xl text-base leading-7 text-parchment-dim sm:text-lg">
              A browsable shelf of manuscripts and books from the wider looted artifacts collection.
            </p>
          </div>

          <div className="rounded-2xl border border-navy-border/70 bg-navy-light/70 px-4 py-3 text-sm text-parchment-dim">
            <span className="block text-xs uppercase tracking-[0.28em] text-gold-dim/80">Matching artifacts</span>
            <span className="mt-1 block text-2xl font-semibold text-parchment">{totalCount}</span>
          </div>
        </div>
      </div>

      <LibraryDescriptionToggle />
    </header>
  );
}