import Link from 'next/link';

export default function MobileTopBar() {
  return (
    <header className="lg:hidden flex h-11 shrink-0 items-center justify-between border-b border-navy-border bg-navy-light/90 px-3">
      <h1 className="font-heading text-base text-parchment truncate">Looted from Maqdala</h1>
      <Link
        href="/library"
        aria-label="View library"
        title="View library"
        className="flex h-9 w-9 items-center justify-center rounded text-gold hover:bg-navy/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </Link>
    </header>
  );
}
