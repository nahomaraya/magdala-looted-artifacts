import Link from 'next/link';

/** Placeholder page for sections that are planned but not yet built. */
export default function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-body text-xs uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
      <h1 className="mt-4 font-heading text-4xl text-parchment md:text-6xl">{title}</h1>
      <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-parchment-dim">
        {description}
      </p>
      <span className="mt-8 rounded-full border border-navy-border px-4 py-1.5 font-body text-xs uppercase tracking-wider text-parchment-dim">
        Coming soon
      </span>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-full border border-parchment-dim/40 px-6 py-2.5 font-body text-sm text-parchment transition-colors hover:border-gold hover:text-gold"
        >
          ← Back to the story
        </Link>
        <Link
          href="/review"
          className="rounded-full bg-gold px-6 py-2.5 font-body text-sm font-semibold text-navy transition-colors hover:bg-gold-dim"
        >
          Open the map
        </Link>
      </div>
    </main>
  );
}
