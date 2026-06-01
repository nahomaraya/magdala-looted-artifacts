import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-navy-border bg-navy py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center md:px-8">
        <p className="max-w-xl font-heading text-lg italic text-parchment-dim">
          “I was a stranger and ye took me in.”
        </p>
        <p className="font-body text-xs text-parchment-dim/70">
          Inscription on Prince Alemayehu’s memorial at St George’s Chapel, Windsor.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-body text-sm text-parchment-dim">
          <Link href="/review" className="transition-colors hover:text-gold">
            The Artifacts
          </Link>
          <Link href="/library" className="transition-colors hover:text-gold">
            The Library
          </Link>
          <Link href="/journey" className="transition-colors hover:text-gold">
            The Journey
          </Link>
          <Link href="/musical" className="transition-colors hover:text-gold">
            The Musical
          </Link>
        </div>
        <p className="mt-4 font-body text-xs text-parchment-dim/50">
          A project documenting the artifacts looted during the 1868 Battle of Magdala, Ethiopia.
        </p>
      </div>
    </footer>
  );
}
